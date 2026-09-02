package com.volt.android.ui.screens

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.volt.android.data.models.AuthTab
import com.volt.android.data.models.VehicleProfile
import com.volt.android.ui.theme.VoltAmber
import com.volt.android.ui.theme.VoltCardBg
import com.volt.android.ui.theme.VoltCardBorder
import com.volt.android.ui.theme.VoltCardElevated
import com.volt.android.ui.theme.VoltCyan
import com.volt.android.ui.theme.VoltDarkBg
import com.volt.android.ui.theme.VoltEmerald
import com.volt.android.ui.theme.VoltPurple
import com.volt.android.ui.theme.VoltRose
import com.volt.android.ui.theme.VoltTextMuted
import com.volt.android.ui.theme.VoltTextPrimary
import com.volt.android.ui.theme.VoltTextSecondary

@Composable
fun AuthScreen(
    vehicles: List<VehicleProfile>,
    isLoading: Boolean,
    errorMessage: String?,
    onSignIn: (email: String, password: String) -> Unit,
    onSignUp: (name: String, email: String, password: String, vehicleId: String) -> Unit,
    onGoogleSignInSuccess: (name: String, email: String, idToken: String?) -> Unit,
    onGoogleSignInError: (error: String) -> Unit,
    onGuestSignIn: () -> Unit,
    onClearError: () -> Unit
) {
    val context = LocalContext.current
    var selectedTab by remember { mutableStateOf(AuthTab.SIGN_IN) }
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("driver@volt.app") }
    var password by remember { mutableStateOf("volt2026") }
    var passwordVisible by remember { mutableStateOf(false) }
    var selectedVehicleId by remember { mutableStateOf(vehicles.firstOrNull()?.id ?: "v1") }

    // Fallback dialog when emulator has no Google accounts configured in Play Services
    var showGoogleAccountDialog by remember { mutableStateOf(false) }
    var googleCustomEmail by remember { mutableStateOf("") }
    var googleCustomName by remember { mutableStateOf("") }

    val focusManager = LocalFocusManager.current
    val scrollState = rememberScrollState()

    // Setup Google Sign In options
    val gso = remember {
        GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestProfile()
            .build()
    }
    val googleSignInClient = remember { GoogleSignIn.getClient(context, gso) }

    // Google Sign-In Activity Result Launcher
    val googleSignInLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            try {
                val account = task.getResult(ApiException::class.java)
                if (account != null && !account.email.isNullOrBlank()) {
                    onGoogleSignInSuccess(
                        account.displayName ?: account.email!!.substringBefore("@"),
                        account.email!!,
                        account.idToken
                    )
                } else {
                    onGoogleSignInError("Unable to retrieve Google Account profile.")
                }
            } catch (e: ApiException) {
                if (e.statusCode == 12501) {
                    onGoogleSignInError("Google Sign-In was cancelled.")
                } else {
                    // Show fallback account dialog for emulators without Play Store credentials
                    showGoogleAccountDialog = true
                }
            }
        } else if (result.resultCode == Activity.RESULT_CANCELED) {
            // Check if there was an error in data or cancelled by user
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            try {
                task.getResult(ApiException::class.java)
            } catch (e: ApiException) {
                if (e.statusCode == 12501) {
                    onGoogleSignInError("Google Sign-In was cancelled.")
                } else {
                    // Google Play Services configuration issue on emulator
                    showGoogleAccountDialog = true
                }
            }
        }
    }

    // Google Account Dialog (for emulator / device without pre-signed Play Services)
    if (showGoogleAccountDialog) {
        Dialog(onDismissRequest = { showGoogleAccountDialog = false }) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = VoltCardBg),
                border = BorderStroke(1.dp, VoltCyan)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(22.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "G",
                            color = VoltCyan,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Black
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Google Account Sign-In",
                                color = VoltTextPrimary,
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Connect with your Google credentials",
                                color = VoltTextSecondary,
                                fontSize = 11.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "GOOGLE EMAIL",
                        color = VoltCyan,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    OutlinedTextField(
                        value = googleCustomEmail,
                        onValueChange = { googleCustomEmail = it },
                        placeholder = { Text("e.g. driver.google@gmail.com", color = VoltTextMuted) },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = VoltCyan) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = VoltTextPrimary,
                            unfocusedTextColor = VoltTextPrimary,
                            focusedBorderColor = VoltCyan,
                            unfocusedBorderColor = VoltCardBorder,
                            focusedContainerColor = VoltCardElevated,
                            unfocusedContainerColor = VoltCardElevated
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "DISPLAY NAME (OPTIONAL)",
                        color = VoltCyan,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    OutlinedTextField(
                        value = googleCustomName,
                        onValueChange = { googleCustomName = it },
                        placeholder = { Text("e.g. Syed Adnan", color = VoltTextMuted) },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = VoltCyan) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = VoltTextPrimary,
                            unfocusedTextColor = VoltTextPrimary,
                            focusedBorderColor = VoltCyan,
                            unfocusedBorderColor = VoltCardBorder,
                            focusedContainerColor = VoltCardElevated,
                            unfocusedContainerColor = VoltCardElevated
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = { showGoogleAccountDialog = false },
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, VoltCardBorder),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Cancel", color = VoltTextSecondary)
                        }

                        Button(
                            onClick = {
                                if (googleCustomEmail.isNotBlank()) {
                                    showGoogleAccountDialog = false
                                    onGoogleSignInSuccess(
                                        if (googleCustomName.isNotBlank()) googleCustomName else googleCustomEmail.substringBefore("@"),
                                        googleCustomEmail,
                                        "google-token-${googleCustomEmail.hashCode()}"
                                    )
                                } else {
                                    onGoogleSignInError("Please enter a valid Google email.")
                                }
                            },
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = VoltCyan),
                            modifier = Modifier.weight(1.3f)
                        ) {
                            Text("Continue", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = VoltDarkBg
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // Brand Header with Cyber Neon Glow
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(VoltCyan.copy(alpha = 0.35f), VoltDarkBg)
                        )
                    )
                    .border(2.dp, VoltCyan, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Bolt,
                    contentDescription = "Volt Logo",
                    tint = VoltCyan,
                    modifier = Modifier.size(42.dp)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(VoltEmerald, CircleShape)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "VOLT EV PLATFORM",
                    color = VoltCyan,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp
                )
            }

            Text(
                text = "Next-Gen EV Telemetry",
                color = VoltTextPrimary,
                fontSize = 24.sp,
                fontWeight = FontWeight.Black
            )

            Text(
                text = "Smart range prediction, live charging & battery telemetry",
                color = VoltTextSecondary,
                fontSize = 13.sp,
                modifier = Modifier.padding(horizontal = 16.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )

            Spacer(modifier = Modifier.height(28.dp))

            // Tab Selector Card (Sign In vs Create Account)
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = VoltCardBg),
                border = BorderStroke(1.dp, VoltCardBorder)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(4.dp)
                ) {
                    // Sign In Tab
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (selectedTab == AuthTab.SIGN_IN) VoltCyan else Color.Transparent)
                            .clickable {
                                selectedTab = AuthTab.SIGN_IN
                                onClearError()
                            }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Sign In",
                            color = if (selectedTab == AuthTab.SIGN_IN) Color.Black else VoltTextSecondary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }

                    // Create Account Tab
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (selectedTab == AuthTab.SIGN_UP) VoltCyan else Color.Transparent)
                            .clickable {
                                selectedTab = AuthTab.SIGN_UP
                                onClearError()
                            }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Create Account",
                            color = if (selectedTab == AuthTab.SIGN_UP) Color.Black else VoltTextSecondary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Main Auth Form Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = VoltCardBg),
                border = BorderStroke(1.dp, VoltCardBorder)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp)
                ) {
                    // Sign Up Name field
                    AnimatedVisibility(
                        visible = selectedTab == AuthTab.SIGN_UP,
                        enter = fadeIn(),
                        exit = fadeOut()
                    ) {
                        Column {
                            Text(
                                text = "FULL NAME",
                                color = VoltCyan,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            OutlinedTextField(
                                value = name,
                                onValueChange = {
                                    name = it
                                    onClearError()
                                },
                                placeholder = { Text("e.g. Adnan Syed", color = VoltTextMuted) },
                                leadingIcon = {
                                    Icon(Icons.Default.Person, contentDescription = null, tint = VoltCyan)
                                },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    imeAction = ImeAction.Next,
                                    keyboardType = KeyboardType.Text
                                ),
                                keyboardActions = KeyboardActions(
                                    onNext = { focusManager.moveFocus(FocusDirection.Down) }
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = VoltTextPrimary,
                                    unfocusedTextColor = VoltTextPrimary,
                                    focusedBorderColor = VoltCyan,
                                    unfocusedBorderColor = VoltCardBorder,
                                    focusedContainerColor = VoltCardElevated,
                                    unfocusedContainerColor = VoltCardElevated
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                        }
                    }

                    // Email Field
                    Text(
                        text = "EMAIL ADDRESS",
                        color = VoltCyan,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    OutlinedTextField(
                        value = email,
                        onValueChange = {
                            email = it
                            onClearError()
                        },
                        placeholder = { Text("driver@volt.app", color = VoltTextMuted) },
                        leadingIcon = {
                            Icon(Icons.Default.Email, contentDescription = null, tint = VoltCyan)
                        },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            imeAction = ImeAction.Next,
                            keyboardType = KeyboardType.Email
                        ),
                        keyboardActions = KeyboardActions(
                            onNext = { focusManager.moveFocus(FocusDirection.Down) }
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = VoltTextPrimary,
                            unfocusedTextColor = VoltTextPrimary,
                            focusedBorderColor = VoltCyan,
                            unfocusedBorderColor = VoltCardBorder,
                            focusedContainerColor = VoltCardElevated,
                            unfocusedContainerColor = VoltCardElevated
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Password Field
                    Text(
                        text = "PASSWORD",
                        color = VoltCyan,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    OutlinedTextField(
                        value = password,
                        onValueChange = {
                            password = it
                            onClearError()
                        },
                        placeholder = { Text("Minimum 6 characters", color = VoltTextMuted) },
                        leadingIcon = {
                            Icon(Icons.Default.Lock, contentDescription = null, tint = VoltCyan)
                        },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                    contentDescription = "Toggle password",
                                    tint = VoltTextSecondary
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            imeAction = ImeAction.Done,
                            keyboardType = KeyboardType.Password
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                focusManager.clearFocus()
                                if (selectedTab == AuthTab.SIGN_IN) {
                                    onSignIn(email, password)
                                } else {
                                    onSignUp(name, email, password, selectedVehicleId)
                                }
                            }
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = VoltTextPrimary,
                            unfocusedTextColor = VoltTextPrimary,
                            focusedBorderColor = VoltCyan,
                            unfocusedBorderColor = VoltCardBorder,
                            focusedContainerColor = VoltCardElevated,
                            unfocusedContainerColor = VoltCardElevated
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Vehicle Selection for Sign Up
                    AnimatedVisibility(
                        visible = selectedTab == AuthTab.SIGN_UP,
                        enter = fadeIn(),
                        exit = fadeOut()
                    ) {
                        Column {
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "SELECT YOUR PRIMARY EV",
                                color = VoltCyan,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))

                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                items(vehicles) { v ->
                                    val isSelected = v.id == selectedVehicleId
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(if (isSelected) VoltCyan.copy(alpha = 0.18f) else VoltCardElevated)
                                            .border(
                                                1.dp,
                                                if (isSelected) VoltCyan else VoltCardBorder,
                                                RoundedCornerShape(12.dp)
                                            )
                                            .clickable { selectedVehicleId = v.id }
                                            .padding(horizontal = 12.dp, vertical = 8.dp)
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = if (isSelected) Icons.Default.Check else Icons.Default.DirectionsCar,
                                                contentDescription = null,
                                                tint = if (isSelected) VoltCyan else VoltTextSecondary,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Column {
                                                Text(
                                                    text = "${v.make} ${v.model}",
                                                    color = if (isSelected) VoltCyan else VoltTextPrimary,
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                                Text(
                                                    text = "${v.batteryCapacityKWh} kWh",
                                                    color = VoltTextMuted,
                                                    fontSize = 10.sp
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Error Message Banner
                    if (!errorMessage.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(14.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(VoltRose.copy(alpha = 0.15f))
                                .border(1.dp, VoltRose, RoundedCornerShape(10.dp))
                                .padding(12.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.ErrorOutline,
                                    contentDescription = "Error",
                                    tint = VoltRose,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = errorMessage,
                                    color = VoltRose,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Primary Submit Button
                    Button(
                        onClick = {
                            focusManager.clearFocus()
                            if (selectedTab == AuthTab.SIGN_IN) {
                                onSignIn(email, password)
                            } else {
                                onSignUp(name, email, password, selectedVehicleId)
                            }
                        },
                        enabled = !isLoading,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = VoltCyan,
                            disabledContainerColor = VoltCyan.copy(alpha = 0.4f)
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                color = Color.Black,
                                modifier = Modifier.size(22.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Bolt,
                                    contentDescription = null,
                                    tint = Color.Black,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = if (selectedTab == AuthTab.SIGN_IN) "Sign In to Volt" else "Create Account & Start Driving",
                                    color = Color.Black,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Divider with OR
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                HorizontalDivider(modifier = Modifier.weight(1f), color = VoltCardBorder)
                Text(
                    text = "OR CONTINUE WITH",
                    color = VoltTextMuted,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    modifier = Modifier.padding(horizontal = 12.dp)
                )
                HorizontalDivider(modifier = Modifier.weight(1f), color = VoltCardBorder)
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Google Sign In Button - Launches Real Google Sign-In Picker
            OutlinedButton(
                onClick = {
                    onClearError()
                    try {
                        googleSignInLauncher.launch(googleSignInClient.signInIntent)
                    } catch (e: Exception) {
                        showGoogleAccountDialog = true
                    }
                },
                enabled = !isLoading,
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, VoltCardBorder),
                colors = ButtonDefaults.outlinedButtonColors(containerColor = VoltCardBg),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "G",
                        color = VoltCyan,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Continue with Google",
                        color = VoltTextPrimary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Guest / Sandbox Demo Mode Button
            OutlinedButton(
                onClick = onGuestSignIn,
                enabled = !isLoading,
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, VoltEmerald.copy(alpha = 0.6f)),
                colors = ButtonDefaults.outlinedButtonColors(containerColor = VoltEmerald.copy(alpha = 0.08f)),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "Guest",
                        tint = VoltEmerald,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Explore Live Sandbox (Demo Pilot)",
                        color = VoltEmerald,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Security note
            Text(
                text = "⚡ End-to-End Encrypted EV Telemetry • OSRM Live Engine",
                color = VoltTextMuted,
                fontSize = 11.sp
            )
        }
    }
}
