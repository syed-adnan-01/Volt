package com.volt.android.data.remote

import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import okhttp3.Interceptor
import okhttp3.Response
import java.util.concurrent.TimeUnit

/**
 * OkHttp Interceptor that retrieves the active Firebase ID token
 * and attaches it as an `Authorization: Bearer <token>` header.
 */
class AuthInterceptor : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val auth = FirebaseAuth.getInstance()
        val currentUser = auth.currentUser

        val token: String? = try {
            if (currentUser != null) {
                val task = currentUser.getIdToken(false)
                val result = Tasks.await(task, 5, TimeUnit.SECONDS)
                result.token
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }

        val requestBuilder = originalRequest.newBuilder()
        if (!token.isNullOrBlank()) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        return chain.proceed(requestBuilder.build())
    }
}
