package com.volt.android.data

import com.google.android.gms.maps.model.LatLng

/**
 * Decodes a Google-encoded polyline string into a list of LatLng points.
 * OSRM and Google Directions API both use this encoding format.
 *
 * @see <a href="https://developers.google.com/maps/documentation/utilities/polylinealgorithm">Polyline Algorithm</a>
 */
object PolylineDecoder {

    /**
     * Decode an encoded polyline string into a list of [LatLng].
     *
     * @param encoded The encoded polyline string from OSRM or Google Directions API.
     * @return A list of [LatLng] representing the decoded route path.
     */
    fun decode(encoded: String): List<LatLng> {
        val poly = mutableListOf<LatLng>()
        var index = 0
        val len = encoded.length
        var lat = 0
        var lng = 0

        while (index < len) {
            // Decode latitude
            var result = 0
            var shift = 0
            var b: Int
            do {
                b = encoded[index++].code - 63
                result = result or ((b and 0x1F) shl shift)
                shift += 5
            } while (b >= 0x20)
            lat += if (result and 1 != 0) (result shr 1).inv() else result shr 1

            // Decode longitude
            result = 0
            shift = 0
            do {
                b = encoded[index++].code - 63
                result = result or ((b and 0x1F) shl shift)
                shift += 5
            } while (b >= 0x20)
            lng += if (result and 1 != 0) (result shr 1).inv() else result shr 1

            poly.add(LatLng(lat / 1E5, lng / 1E5))
        }

        return poly
    }
}
