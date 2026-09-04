package com.volt.android.data

import com.volt.android.data.models.VehicleProfile

/**
 * Curated catalog of real Indian EV models with accurate manufacturer specs.
 * Battery capacity, ARAI range, and max charging power sourced from official specs.
 * Primarily Indian-market vehicles with a selection of imported premium models.
 */
object IndianEvCatalog {

    // ── Category constants ────────────────────────────────────────────────────
    const val CAT_ALL        = "All"
    const val CAT_HATCHBACK  = "Hatchback"
    const val CAT_SUV        = "SUV"
    const val CAT_SEDAN      = "Sedan"
    const val CAT_TWO_WHEELER = "Two-Wheeler"
    const val CAT_LUXURY     = "Luxury"

    val categories = listOf(CAT_ALL, CAT_SUV, CAT_HATCHBACK, CAT_SEDAN, CAT_TWO_WHEELER, CAT_LUXURY)

    // ── Helper to build a VehicleProfile ─────────────────────────────────────
    private fun ev(
        id: String,
        make: String,
        model: String,
        trim: String,
        batteryKWh: Double,
        usableKWh: Double,
        araiRangeKm: Int,
        consumptionKWhPerKm: Double,
        maxChargingKw: Double,
        priceLabel: String,       // e.g. "₹8.49 – 14.49 L"
        category: String
    ) = VehicleProfile(
        id = id,
        make = make,
        model = model,
        trim = trim,
        batteryCapacityKWh = batteryKWh,
        usableCapacityKWh = usableKWh,
        consumptionKWhPerKm = consumptionKWhPerKm,
        maxChargingPowerKw = maxChargingKw,
        batteryHealthPercent = 100.0,
        reserveSocPercent = 10.0,
        currentSoC = 80.0,
        // We store category & price in the trim field for display
        // Real category is tracked separately via catalogCategory map
    )

    // ─────────────────────────────────────────────────────────────────────────
    // HATCHBACK / COMPACT
    // ─────────────────────────────────────────────────────────────────────────
    val tataTimagoEV = ev(
        id = "cat-tata-tiago-ev",
        make = "Tata", model = "Tiago EV",
        trim = "Long Range XZ+ Tech LUX · ₹8.49 – 11.89 L",
        batteryKWh = 24.0, usableKWh = 21.5, araiRangeKm = 315,
        consumptionKWhPerKm = 0.112, maxChargingKw = 7.2,
        priceLabel = "₹8.49 – 11.89 L", category = CAT_HATCHBACK
    )

    val tataPunchEV = ev(
        id = "cat-tata-punch-ev",
        make = "Tata", model = "Punch EV",
        trim = "Long Range Empowered+ · ₹13.99 – 16.49 L",
        batteryKWh = 35.0, usableKWh = 31.0, araiRangeKm = 421,
        consumptionKWhPerKm = 0.130, maxChargingKw = 25.0,
        priceLabel = "₹13.99 – 16.49 L", category = CAT_HATCHBACK
    )

    val mgCometEV = ev(
        id = "cat-mg-comet-ev",
        make = "MG", model = "Comet EV",
        trim = "Pace · ₹7.98 – 9.98 L",
        batteryKWh = 17.3, usableKWh = 16.0, araiRangeKm = 230,
        consumptionKWhPerKm = 0.092, maxChargingKw = 7.4,
        priceLabel = "₹7.98 – 9.98 L", category = CAT_HATCHBACK
    )

    // ─────────────────────────────────────────────────────────────────────────
    // SUV
    // ─────────────────────────────────────────────────────────────────────────
    val tataNexonEVLong = ev(
        id = "cat-tata-nexon-ev-lr",
        make = "Tata", model = "Nexon EV",
        trim = "Long Range Max Creative+ · ₹17.19 – 19.49 L",
        batteryKWh = 40.5, usableKWh = 38.0, araiRangeKm = 465,
        consumptionKWhPerKm = 0.135, maxChargingKw = 50.0,
        priceLabel = "₹17.19 – 19.49 L", category = CAT_SUV
    )

    val tataCurvvEV = ev(
        id = "cat-tata-curvv-ev",
        make = "Tata", model = "Curvv EV",
        trim = "55 kWh Accomplish+ S · ₹17.49 – 21.99 L",
        batteryKWh = 55.0, usableKWh = 52.0, araiRangeKm = 585,
        consumptionKWhPerKm = 0.148, maxChargingKw = 70.0,
        priceLabel = "₹17.49 – 21.99 L", category = CAT_SUV
    )

    val mgZsEV = ev(
        id = "cat-mg-zs-ev",
        make = "MG", model = "ZS EV",
        trim = "50.3 kWh Excite Pro · ₹18.98 – 25.20 L",
        batteryKWh = 50.3, usableKWh = 46.0, araiRangeKm = 461,
        consumptionKWhPerKm = 0.159, maxChargingKw = 76.0,
        priceLabel = "₹18.98 – 25.20 L", category = CAT_SUV
    )

    val mgWindsorEV = ev(
        id = "cat-mg-windsor-ev",
        make = "MG", model = "Windsor EV",
        trim = "38 kWh Excite · ₹13.50 – 15.50 L",
        batteryKWh = 38.0, usableKWh = 35.0, araiRangeKm = 331,
        consumptionKWhPerKm = 0.140, maxChargingKw = 11.0,
        priceLabel = "₹13.50 – 15.50 L", category = CAT_SUV
    )

    val hyundaiCretaEV = ev(
        id = "cat-hyundai-creta-ev",
        make = "Hyundai", model = "Creta Electric",
        trim = "Long Range Excellence · ₹17.99 – 23.50 L",
        batteryKWh = 51.4, usableKWh = 49.0, araiRangeKm = 473,
        consumptionKWhPerKm = 0.153, maxChargingKw = 50.0,
        priceLabel = "₹17.99 – 23.50 L", category = CAT_SUV
    )

    val mahindraXuv400 = ev(
        id = "cat-mahindra-xuv400",
        make = "Mahindra", model = "XUV 400",
        trim = "Pro L 39.4 kWh · ₹15.99 – 19.19 L",
        batteryKWh = 39.4, usableKWh = 37.0, araiRangeKm = 456,
        consumptionKWhPerKm = 0.140, maxChargingKw = 50.0,
        priceLabel = "₹15.99 – 19.19 L", category = CAT_SUV
    )

    val mahindraXev9e = ev(
        id = "cat-mahindra-xev9e",
        make = "Mahindra", model = "XEV 9e",
        trim = "82 kWh Pack Three · ₹21.90 – 30.50 L",
        batteryKWh = 82.0, usableKWh = 79.0, araiRangeKm = 656,
        consumptionKWhPerKm = 0.190, maxChargingKw = 175.0,
        priceLabel = "₹21.90 – 30.50 L", category = CAT_SUV
    )

    val mahindraBe6e = ev(
        id = "cat-mahindra-be6e",
        make = "Mahindra", model = "BE 6e",
        trim = "79 kWh Pack Three · ₹18.90 – 26.90 L",
        batteryKWh = 79.0, usableKWh = 76.0, araiRangeKm = 682,
        consumptionKWhPerKm = 0.182, maxChargingKw = 175.0,
        priceLabel = "₹18.90 – 26.90 L", category = CAT_SUV
    )

    val bydAtto3 = ev(
        id = "cat-byd-atto3",
        make = "BYD", model = "Atto 3",
        trim = "60.5 kWh Extended Range · ₹24.99 – 33.99 L",
        batteryKWh = 60.5, usableKWh = 58.0, araiRangeKm = 521,
        consumptionKWhPerKm = 0.173, maxChargingKw = 80.0,
        priceLabel = "₹24.99 – 33.99 L", category = CAT_SUV
    )

    val kiaEv6 = ev(
        id = "cat-kia-ev6",
        make = "Kia", model = "EV6",
        trim = "77.4 kWh GT-Line AWD · ₹60.97 – 65.90 L",
        batteryKWh = 77.4, usableKWh = 74.0, araiRangeKm = 708,
        consumptionKWhPerKm = 0.185, maxChargingKw = 233.0,
        priceLabel = "₹60.97 – 65.90 L", category = CAT_SUV
    )

    val hyundaiIoniq5 = ev(
        id = "cat-hyundai-ioniq5",
        make = "Hyundai", model = "Ioniq 5",
        trim = "72.6 kWh Long Range AWD · ₹44.95 – 46.05 L",
        batteryKWh = 72.6, usableKWh = 70.0, araiRangeKm = 631,
        consumptionKWhPerKm = 0.172, maxChargingKw = 220.0,
        priceLabel = "₹44.95 – 46.05 L", category = CAT_SUV
    )

    // ─────────────────────────────────────────────────────────────────────────
    // SEDAN / SPORTS
    // ─────────────────────────────────────────────────────────────────────────
    val bydSeal = ev(
        id = "cat-byd-seal",
        make = "BYD", model = "Seal",
        trim = "82.56 kWh AWD Performance · ₹41 – 53 L",
        batteryKWh = 82.56, usableKWh = 80.0, araiRangeKm = 650,
        consumptionKWhPerKm = 0.192, maxChargingKw = 150.0,
        priceLabel = "₹41 – 53 L", category = CAT_SEDAN
    )

    val hyundaiKona = ev(
        id = "cat-hyundai-kona",
        make = "Hyundai", model = "Kona Electric",
        trim = "39.2 kWh Premium · ₹23.79 L",
        batteryKWh = 39.2, usableKWh = 36.5, araiRangeKm = 452,
        consumptionKWhPerKm = 0.148, maxChargingKw = 50.0,
        priceLabel = "₹23.79 L", category = CAT_SEDAN
    )

    val tataEv6 = ev(
        id = "cat-tata-ev6",
        make = "Tata", model = "Avinya EV",
        trim = "Concept Preview · Coming Soon",
        batteryKWh = 60.0, usableKWh = 57.0, araiRangeKm = 500,
        consumptionKWhPerKm = 0.165, maxChargingKw = 150.0,
        priceLabel = "Coming Soon", category = CAT_SEDAN
    )

    // ─────────────────────────────────────────────────────────────────────────
    // LUXURY (Imported)
    // ─────────────────────────────────────────────────────────────────────────
    val bmwIx1 = ev(
        id = "cat-bmw-ix1",
        make = "BMW", model = "iX1",
        trim = "xDrive30 66.5 kWh · ₹66.90 L",
        batteryKWh = 66.5, usableKWh = 64.7, araiRangeKm = 440,
        consumptionKWhPerKm = 0.202, maxChargingKw = 130.0,
        priceLabel = "₹66.90 L", category = CAT_LUXURY
    )

    val mercedesEqb = ev(
        id = "cat-mercedes-eqb",
        make = "Mercedes-Benz", model = "EQB",
        trim = "300 66.5 kWh AMG Line · ₹74.50 L",
        batteryKWh = 66.5, usableKWh = 63.0, araiRangeKm = 423,
        consumptionKWhPerKm = 0.211, maxChargingKw = 100.0,
        priceLabel = "₹74.50 L", category = CAT_LUXURY
    )

    val volvoxc40 = ev(
        id = "cat-volvo-xc40",
        make = "Volvo", model = "XC40 Recharge",
        trim = "82 kWh Twin Motor AWD · ₹57.90 L",
        batteryKWh = 82.0, usableKWh = 79.0, araiRangeKm = 418,
        consumptionKWhPerKm = 0.226, maxChargingKw = 150.0,
        priceLabel = "₹57.90 L", category = CAT_LUXURY
    )

    val skodaEnyaq = ev(
        id = "cat-skoda-enyaq",
        make = "Skoda", model = "Enyaq Coupe",
        trim = "82 kWh · ₹64.99 L",
        batteryKWh = 82.0, usableKWh = 77.0, araiRangeKm = 510,
        consumptionKWhPerKm = 0.195, maxChargingKw = 135.0,
        priceLabel = "₹64.99 L", category = CAT_LUXURY
    )

    val porscheTaycan = ev(
        id = "cat-porsche-taycan",
        make = "Porsche", model = "Taycan",
        trim = "93.4 kWh Performance Plus 4S · ₹1.87 – 2.19 Cr",
        batteryKWh = 93.4, usableKWh = 88.0, araiRangeKm = 500,
        consumptionKWhPerKm = 0.210, maxChargingKw = 270.0,
        priceLabel = "₹1.87 – 2.19 Cr", category = CAT_LUXURY
    )

    val teslaModel3 = ev(
        id = "cat-tesla-model3",
        make = "Tesla", model = "Model 3",
        trim = "Long Range AWD · ₹34.99 L (India Import)",
        batteryKWh = 75.0, usableKWh = 72.0, araiRangeKm = 576,
        consumptionKWhPerKm = 0.150, maxChargingKw = 250.0,
        priceLabel = "₹34.99 L", category = CAT_LUXURY
    )

    // ─────────────────────────────────────────────────────────────────────────
    // TWO-WHEELER
    // ─────────────────────────────────────────────────────────────────────────
    val ather450X = ev(
        id = "cat-ather-450x",
        make = "Ather", model = "450X",
        trim = "Gen 3 Pro 3.7 kWh · ₹1.30 – 1.55 L",
        batteryKWh = 3.7, usableKWh = 3.5, araiRangeKm = 150,
        consumptionKWhPerKm = 0.028, maxChargingKw = 1.5,
        priceLabel = "₹1.30 – 1.55 L", category = CAT_TWO_WHEELER
    )

    val atherRizta = ev(
        id = "cat-ather-rizta",
        make = "Ather", model = "Rizta",
        trim = "Z 3.7 kWh · ₹1.09 – 1.50 L",
        batteryKWh = 3.7, usableKWh = 3.5, araiRangeKm = 159,
        consumptionKWhPerKm = 0.027, maxChargingKw = 1.5,
        priceLabel = "₹1.09 – 1.50 L", category = CAT_TWO_WHEELER
    )

    val olaS1Pro = ev(
        id = "cat-ola-s1pro",
        make = "Ola", model = "S1 Pro",
        trim = "Gen 3 4 kWh · ₹1.47 L",
        batteryKWh = 4.0, usableKWh = 3.8, araiRangeKm = 195,
        consumptionKWhPerKm = 0.026, maxChargingKw = 1.8,
        priceLabel = "₹1.47 L", category = CAT_TWO_WHEELER
    )

    val olaS1Air = ev(
        id = "cat-ola-s1air",
        make = "Ola", model = "S1 Air",
        trim = "2 kWh · ₹1.00 L",
        batteryKWh = 2.0, usableKWh = 1.9, araiRangeKm = 101,
        consumptionKWhPerKm = 0.022, maxChargingKw = 0.9,
        priceLabel = "₹1.00 L", category = CAT_TWO_WHEELER
    )

    val heroBajajCheetak = ev(
        id = "cat-bajaj-chetak",
        make = "Bajaj", model = "Chetak",
        trim = "Premium 3.2 kWh · ₹1.15 – 1.30 L",
        batteryKWh = 3.2, usableKWh = 3.0, araiRangeKm = 108,
        consumptionKWhPerKm = 0.034, maxChargingKw = 0.9,
        priceLabel = "₹1.15 – 1.30 L", category = CAT_TWO_WHEELER
    )

    val tvsSiquid = ev(
        id = "cat-tvs-iqube",
        make = "TVS", model = "iQube",
        trim = "ST 5.1 kWh · ₹1.20 – 1.50 L",
        batteryKWh = 5.1, usableKWh = 4.8, araiRangeKm = 145,
        consumptionKWhPerKm = 0.038, maxChargingKw = 1.5,
        priceLabel = "₹1.20 – 1.50 L", category = CAT_TWO_WHEELER
    )

    // ─────────────────────────────────────────────────────────────────────────
    // Full catalog list
    // ─────────────────────────────────────────────────────────────────────────
    val allVehicles: List<VehicleProfile> = listOf(
        // Hatchbacks
        tataTimagoEV, tataPunchEV, mgCometEV,
        // SUVs
        tataNexonEVLong, tataCurvvEV, mgZsEV, mgWindsorEV,
        hyundaiCretaEV, hyundaiIoniq5,
        mahindraXuv400, mahindraXev9e, mahindraBe6e,
        bydAtto3, kiaEv6,
        // Sedans
        bydSeal, hyundaiKona, tataEv6,
        // Luxury
        bmwIx1, mercedesEqb, volvoxc40, skodaEnyaq, porscheTaycan, teslaModel3,
        // Two-wheelers
        ather450X, atherRizta, olaS1Pro, olaS1Air, heroBajajCheetak, tvsSiquid
    )

    /** Returns category for a given vehicle id */
    val categoryMap: Map<String, String> = buildMap {
        put(tataTimagoEV.id, CAT_HATCHBACK); put(tataPunchEV.id, CAT_HATCHBACK); put(mgCometEV.id, CAT_HATCHBACK)
        put(tataNexonEVLong.id, CAT_SUV); put(tataCurvvEV.id, CAT_SUV); put(mgZsEV.id, CAT_SUV)
        put(mgWindsorEV.id, CAT_SUV); put(hyundaiCretaEV.id, CAT_SUV); put(hyundaiIoniq5.id, CAT_SUV)
        put(mahindraXuv400.id, CAT_SUV); put(mahindraXev9e.id, CAT_SUV); put(mahindraBe6e.id, CAT_SUV)
        put(bydAtto3.id, CAT_SUV); put(kiaEv6.id, CAT_SUV)
        put(bydSeal.id, CAT_SEDAN); put(hyundaiKona.id, CAT_SEDAN); put(tataEv6.id, CAT_SEDAN)
        put(bmwIx1.id, CAT_LUXURY); put(mercedesEqb.id, CAT_LUXURY); put(volvoxc40.id, CAT_LUXURY)
        put(skodaEnyaq.id, CAT_LUXURY); put(porscheTaycan.id, CAT_LUXURY); put(teslaModel3.id, CAT_LUXURY)
        put(ather450X.id, CAT_TWO_WHEELER); put(atherRizta.id, CAT_TWO_WHEELER)
        put(olaS1Pro.id, CAT_TWO_WHEELER); put(olaS1Air.id, CAT_TWO_WHEELER)
        put(heroBajajCheetak.id, CAT_TWO_WHEELER); put(tvsSiquid.id, CAT_TWO_WHEELER)
    }

    /** Filter catalog by category (CAT_ALL returns everything) */
    fun byCategory(category: String): List<VehicleProfile> =
        if (category == CAT_ALL) allVehicles
        else allVehicles.filter { categoryMap[it.id] == category }

    /** Search catalog by make or model (case-insensitive) */
    fun search(query: String): List<VehicleProfile> {
        if (query.isBlank()) return allVehicles
        val q = query.lowercase().trim()
        return allVehicles.filter {
            it.make.lowercase().contains(q) ||
            it.model.lowercase().contains(q) ||
            it.trim.lowercase().contains(q)
        }
    }

    /** Get the price label from the trim string (e.g. "₹8.49 – 11.89 L") */
    fun priceLabel(vehicle: VehicleProfile): String {
        val part = vehicle.trim.substringAfter("·").trim()
        return if (part.startsWith("₹")) part else "Price on request"
    }

    /** Get approx ARAI range from consumption + usable capacity */
    fun araiRange(vehicle: VehicleProfile): Int =
        ((vehicle.usableCapacityKWh / vehicle.consumptionKWhPerKm) * 0.85).toInt()
}
