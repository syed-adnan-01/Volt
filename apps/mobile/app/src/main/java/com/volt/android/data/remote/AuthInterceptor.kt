package com.volt.android.data.remote

import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import okhttp3.Interceptor
import okhttp3.Response
import java.util.concurrent.TimeUnit

/**
 * OkHttp Interceptor that retrieves the active authentication token
 * (from AuthSessionManager or Firebase) and attaches it as an
 * `Authorization: Bearer <token>` header.
 */
class AuthInterceptor : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // 1. First check AuthSessionManager token (covers custom email, Google, guest, demo tokens)
        var token: String? = AuthSessionManager.currentToken

        // 2. If null, attempt fallback to active Firebase user if initialized
        if (token.isNullOrBlank()) {
            token = try {
                val auth = FirebaseAuth.getInstance()
                val currentUser = auth.currentUser
                if (currentUser != null) {
                    val task = currentUser.getIdToken(false)
                    val result = Tasks.await(task, 5, TimeUnit.SECONDS)
                    result.token
                } else {
                    null
                }
            } catch (e: Throwable) {
                null
            }
        }

        val requestBuilder = originalRequest.newBuilder()
        if (!token.isNullOrBlank()) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        return chain.proceed(requestBuilder.build())
    }
}
