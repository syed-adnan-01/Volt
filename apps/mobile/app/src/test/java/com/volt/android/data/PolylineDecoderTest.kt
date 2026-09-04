package com.volt.android.data

import com.google.android.gms.maps.model.LatLng
import com.volt.android.data.models.ChargingStation
import com.volt.android.data.models.Connector
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PolylineDecoderTest {

    @Test
    fun decode_handlesGeoJsonLineString() {
        val geoJson = """{"type":"LineString","coordinates":[[77.5946,12.9716],[76.6394,12.2958]]}"""
        val points = PolylineDecoder.decode(geoJson)

        assertEquals(2, points.size)
        assertEquals(12.9716, points[0].latitude, 0.0001)
        assertEquals(77.5946, points[0].longitude, 0.0001)
        assertEquals(12.2958, points[1].latitude, 0.0001)
        assertEquals(76.6394, points[1].longitude, 0.0001)
    }

    @Test
    fun decode_handlesNestedGeometryGeoJson() {
        val geoJson = """{"geometry":{"coordinates":[[77.5946,12.9716],[76.9,12.5],[76.6394,12.2958]]}}"""
        val points = PolylineDecoder.decode(geoJson)

        assertEquals(3, points.size)
        assertEquals(12.9716, points[0].latitude, 0.0001)
        assertEquals(77.5946, points[0].longitude, 0.0001)
    }

    @Test
    fun decode_handlesJsonCoordinateArray() {
        val arrayJson = """[[77.5946, 12.9716], [76.6394, 12.2958]]"""
        val points = PolylineDecoder.decode(arrayJson)

        assertEquals(2, points.size)
        assertEquals(12.9716, points[0].latitude, 0.0001)
        assertEquals(77.5946, points[0].longitude, 0.0001)
    }

    @Test
    fun decode_handlesJsonObjectArray() {
        val objArrayJson = """[{"lat": 12.9716, "lng": 77.5946}, {"lat": 12.2958, "lng": 76.6394}]"""
        val points = PolylineDecoder.decode(objArrayJson)

        assertEquals(2, points.size)
        assertEquals(12.9716, points[0].latitude, 0.0001)
        assertEquals(77.5946, points[0].longitude, 0.0001)
    }

    @Test
    fun decode_handlesGoogleEncodedPolyline() {
        // "_p~iF~ps|U_ulLnnqC_mqNvxq`@" -> (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
        val encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
        val points = PolylineDecoder.decode(encoded)

        assertEquals(3, points.size)
        assertEquals(38.5, points[0].latitude, 0.001)
        assertEquals(-120.2, points[0].longitude, 0.001)
    }

    @Test
    fun decode_handlesEmptyAndMalformedInputsGracefully() {
        assertTrue(PolylineDecoder.decode(null).isEmpty())
        assertTrue(PolylineDecoder.decode("").isEmpty())
        assertTrue(PolylineDecoder.decode("   ").isEmpty())
        assertTrue(PolylineDecoder.decode("null").isEmpty())
        assertTrue(PolylineDecoder.decode("[]").isEmpty())
        assertTrue(PolylineDecoder.decode("{}").isEmpty())
    }

    @Test
    fun buildPathThroughStops_connectsAllWaypoints() {
        val origin = LatLng(12.9716, 77.5946)
        val stop1 = LatLng(12.6, 77.1)
        val stop2 = LatLng(12.4, 76.8)
        val dest = LatLng(12.2958, 76.6394)

        val path = PolylineDecoder.buildPathThroughStops(listOf(origin, stop1, stop2, dest), pointsPerSegment = 5)

        assertTrue(path.size >= 4)
        assertEquals(origin.latitude, path.first().latitude, 0.0001)
        assertEquals(dest.latitude, path.last().latitude, 0.0001)
    }

    @Test
    fun ensurePathVisitsAllStops_splicesMissingChargingStops() {
        val origin = LatLng(12.9716, 77.5946)
        val dest = LatLng(12.2958, 76.6394)
        val directRoute = listOf(origin, dest)

        val chargerStop = LatLng(12.5, 77.0)
        val resultRoute = PolylineDecoder.ensurePathVisitsAllStops(
            baseRoute = directRoute,
            origin = origin,
            chargingStops = listOf(chargerStop),
            destination = dest
        )

        assertTrue(resultRoute.size > directRoute.size)
        // Verify chargerStop is included in the route
        assertTrue(resultRoute.any { it.latitude == chargerStop.latitude && it.longitude == chargerStop.longitude })
    }

    @Test
    fun ensurePathVisitsAllStops_generatesPathWhenBaseRouteEmpty() {
        val origin = LatLng(12.9716, 77.5946)
        val chargerStop = LatLng(12.5, 77.0)
        val dest = LatLng(12.2958, 76.6394)

        val resultRoute = PolylineDecoder.ensurePathVisitsAllStops(
            baseRoute = emptyList(),
            origin = origin,
            chargingStops = listOf(chargerStop),
            destination = dest
        )

        assertTrue(resultRoute.size >= 3)
        assertEquals(origin.latitude, resultRoute.first().latitude, 0.0001)
        assertEquals(dest.latitude, resultRoute.last().latitude, 0.0001)
        assertTrue(resultRoute.any { it.latitude == chargerStop.latitude && it.longitude == chargerStop.longitude })
    }

    @Test
    fun encodePolyline_and_decode_preservesCoordinatesAccurately() {
        val original = listOf(
            LatLng(12.9716, 77.5946),
            LatLng(12.6000, 77.0690),
            LatLng(12.2958, 76.6394)
        )
        val encoded = GoogleDirectionsClient.encodePolyline(original)
        val decoded = PolylineDecoder.decode(encoded)

        assertEquals(original.size, decoded.size)
        for (i in original.indices) {
            assertEquals(original[i].latitude, decoded[i].latitude, 0.0001)
            assertEquals(original[i].longitude, decoded[i].longitude, 0.0001)
        }
    }

    @Test
    fun generateFallbackPolyline_connectsBengaluruToMysuruThroughChargingStop() {
        val originLat = 12.9716
        val originLng = 77.5946
        val destLat = 12.2958
        val destLng = 76.6394
        val chargerStop = LatLng(12.6000, 77.0690)

        val polyline = GoogleDirectionsClient.generateFallbackPolyline(
            originLat, originLng, destLat, destLng,
            listOf(chargerStop)
        )
        val points = PolylineDecoder.decode(polyline)

        assertTrue("Should have multiple points connecting the corridor", points.size > 20)
        assertEquals(originLat, points.first().latitude, 0.001)
        assertEquals(originLng, points.first().longitude, 0.001)
        assertEquals(destLat, points.last().latitude, 0.001)
        assertEquals(destLng, points.last().longitude, 0.001)

        // Ensure the path passes within 100 meters of the charger stop
        val passesCharger = points.any {
            Math.abs(it.latitude - chargerStop.latitude) < 0.005 &&
            Math.abs(it.longitude - chargerStop.longitude) < 0.005
        }
        assertTrue("Route should pass right through charging stop", passesCharger)
    }

    @Test
    fun ensurePathVisitsAllStops_discardsCorruptedOffMapRoute_andRecoversTrueRoute() {
        val origin = LatLng(12.9716, 77.5946)
        val chargerStop = LatLng(12.6000, 77.0690)
        val dest = LatLng(12.2958, 76.6394)

        // Corrupted off-map route in Arabian sea (from old bitwise bug)
        val corruptedSeaRoute = listOf(
            LatLng(10.48576, 73.40032),
            LatLng(10.81344, 73.72800),
            LatLng(11.14112, 74.05568)
        )

        val recovered = PolylineDecoder.ensurePathVisitsAllStops(
            baseRoute = corruptedSeaRoute,
            origin = origin,
            chargingStops = listOf(chargerStop),
            destination = dest
        )

        // Should discard the sea route and correctly anchor to Bengaluru -> Stop -> Mysuru
        assertEquals(origin.latitude, recovered.first().latitude, 0.001)
        assertEquals(origin.longitude, recovered.first().longitude, 0.001)
        assertEquals(dest.latitude, recovered.last().latitude, 0.001)
        assertEquals(dest.longitude, recovered.last().longitude, 0.001)
        assertTrue(recovered.any {
            Math.abs(it.latitude - chargerStop.latitude) < 0.005 &&
            Math.abs(it.longitude - chargerStop.longitude) < 0.005
        })
    }

    @Test
    fun calculateTrip_bengaluruToMangaluru_selectsRealCorridorFastCharger() {
        val repo = VoltRepository()
        val vehicle = repo.sampleVehicles[0] // Tesla Model 3
        val plan = repo.calculateTrip(
            origin = "Bengaluru",
            destination = "Mangaluru",
            distanceKm = 350.0,
            vehicle = vehicle,
            batteryPercent = 33.0,
            originLat = 12.9716,
            originLng = 77.5946,
            destLat = 12.9141,
            destLng = 74.8560
        )

        assertTrue(plan.totalChargingTimeMinutes > 0)
        assertEquals(3, plan.stops.size)
        val chargerStop = plan.stops[1]
        assertEquals(com.volt.android.data.models.StopType.CHARGER_STOP, chargerStop.type)
        // Verify real station is selected along the NH 75 corridor (Hassan / Channarayapatna)
        assertTrue(
            "Station should be a real charging station (not imaginary dummy)",
            chargerStop.name.contains("Jio-bp") || chargerStop.name.contains("Hassan") || chargerStop.name.contains("Zeon")
        )
        assertNotNull(chargerStop.latitude)
        assertNotNull(chargerStop.longitude)
        // Coordinates should be in Karnataka corridor between Bengaluru and Mangaluru
        assertTrue(chargerStop.latitude!! in 12.5..13.5)
        assertTrue(chargerStop.longitude!! in 75.5..77.0)
    }

    @Test
    fun parseOpenChargeMapJson_extractsRealStationFieldsAccurately() {
        val sampleJson = """
        [
            {
                "ID": 309267,
                "AddressInfo": {
                    "Title": "JW Marriott EV Hub",
                    "AddressLine1": "Vittal Mallya Road",
                    "Town": "Bengaluru",
                    "StateOrProvince": "Karnataka",
                    "Latitude": 12.9722,
                    "Longitude": 77.5949
                },
                "OperatorInfo": {
                    "Title": "Chargezone (India)"
                },
                "Connections": [
                    {
                        "ConnectionType": { "Title": "CCS (Type 2)" },
                        "PowerKW": 60.0,
                        "StatusType": { "IsOperational": true },
                        "Quantity": 2
                    }
                ],
                "UsageCost": "23/kWh"
            }
        ]
        """.trimIndent()

        val stations = OpenChargeMapClient.parseOpenChargeMapJson(sampleJson)
        assertEquals(1, stations.size)
        val station = stations[0]
        assertEquals("ocm-309267", station.id)
        assertEquals("JW Marriott EV Hub", station.name)
        assertEquals("Chargezone (India)", station.operator)
        assertEquals(12.9722, station.latitude!!, 0.0001)
        assertEquals(77.5949, station.longitude!!, 0.0001)
        assertEquals(60, station.powerKw)
        assertTrue(station.isFastCharger)
        assertEquals(1, station.connectors.size)
        assertEquals("CCS2", station.connectors[0].connectorType)
        assertEquals(60.0, station.connectors[0].powerKw, 0.1)
    }

    @Test
    fun calculateTrip_delhiToJaipur_withCorridorStations_selectsRealCharger() {
        val repo = VoltRepository()
        val vehicle = repo.sampleVehicles[0]

        // Simulate corridor stations fetched from OpenChargeMap for Delhi -> Jaipur (NH 48)
        val sampleDelhiJaipur = listOf(
            ChargingStation(
                id = "ocm-dj-1",
                name = "Hotel Highway King Fast Charger",
                operator = "Statiq",
                address = "NH 48, Behror, Rajasthan",
                powerKw = 120,
                isFastCharger = true,
                connectors = listOf(Connector(connectorType = "CCS2", powerKw = 120.0)),
                availablePlugs = 2,
                totalPlugs = 2,
                pricePerKWh = 0.22,
                distanceKm = 135.0,
                latitude = 27.8920,
                longitude = 76.2840,
                isReachable = true
            )
        )

        // Inject corridor stations into repo
        val repoStationsField = VoltRepository::class.java.getDeclaredField("_stations")
        repoStationsField.isAccessible = true
        @Suppress("UNCHECKED_CAST")
        val stateFlow = repoStationsField.get(repo) as kotlinx.coroutines.flow.MutableStateFlow<List<ChargingStation>>
        stateFlow.value = sampleDelhiJaipur

        val plan = repo.calculateTrip(
            origin = "Delhi",
            destination = "Jaipur",
            distanceKm = 280.0,
            vehicle = vehicle,
            batteryPercent = 35.0,
            originLat = 28.6139,
            originLng = 77.2090,
            destLat = 26.9124,
            destLng = 75.7873
        )

        assertTrue(plan.totalChargingTimeMinutes > 0)
        val chargerStop = plan.stops[1]
        assertEquals("Statiq — Hotel Highway King Fast Charger", chargerStop.name)
        assertEquals(27.8920, chargerStop.latitude!!, 0.001)
        assertEquals(76.2840, chargerStop.longitude!!, 0.001)
    }
}
