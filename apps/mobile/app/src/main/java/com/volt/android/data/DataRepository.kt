package com.volt.android.data

import kotlinx.coroutines.flow.Flow

interface DataRepository {
    val data: Flow<List<String>>
}
