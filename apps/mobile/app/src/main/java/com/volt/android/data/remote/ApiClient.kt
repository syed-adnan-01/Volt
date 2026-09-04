package com.volt.android.data.remote

import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    /**
     * Default base URL:
     * - `http://10.0.2.2:3000/` points to localhost:3000 on the Android Emulator host machine.
     */
    private var baseUrl: String = "http://10.0.2.2:3000/"

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
        encodeDefaults = true
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor())
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private var retrofit: Retrofit = buildRetrofit()

    var apiService: VoltApiService = retrofit.create(VoltApiService::class.java)
        private set

    fun setBaseUrl(newBaseUrl: String) {
        val sanitizedUrl = if (newBaseUrl.endsWith("/")) newBaseUrl else "$newBaseUrl/"
        baseUrl = sanitizedUrl
        retrofit = buildRetrofit()
        apiService = retrofit.create(VoltApiService::class.java)
    }

    private fun buildRetrofit(): Retrofit {
        val contentType = "application/json".toMediaType()
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
    }
}
