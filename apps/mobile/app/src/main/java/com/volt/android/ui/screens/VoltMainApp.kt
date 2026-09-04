package com.volt.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BatteryChargingFull
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.EvStation
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.volt.android.ui.components.ProfileDialog
import com.volt.android.ui.theme.VoltCardBg
import com.volt.android.ui.theme.VoltCardBorder
import com.volt.android.ui.theme.VoltCyan
import com.volt.android.ui.theme.VoltDarkBg
import com.volt.android.ui.theme.VoltTextMuted
import com.volt.android.ui.theme.VoltTextSecondary
import com.volt.android.ui.viewmodel.VoltNavTab
import com.volt.android.ui.viewmodel.VoltViewModel

@Composable
fun VoltMainApp(
    viewModel: VoltViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showProfileDialog by remember { mutableStateOf(false) }

    // ──────────────────────────────────────────────
    // 1. Show AuthScreen if not authenticated
    // ──────────────────────────────────────────────
    if (!uiState.isAuthenticated) {
        AuthScreen(
            vehicles = uiState.allVehicles,
            isLoading = uiState.isAuthLoading,
            errorMessage = uiState.authError,
            onSignIn = { email, password ->
                viewModel.loginWithEmail(email, password)
            },
            onSignUp = { name, email, password, vehicleId ->
                viewModel.signUp(name, email, password, vehicleId)
            },
            onGoogleSignInSuccess = { name, email, idToken ->
                viewModel.onGoogleSignInResult(name, email, idToken)
            },
            onGoogleSignInError = { error ->
                viewModel.onGoogleSignInError(error)
            },
            onGuestSignIn = {
                viewModel.loginAsGuest()
            },
            onClearError = {
                viewModel.clearAuthError()
            }
        )
        return
    }

    // ──────────────────────────────────────────────
    // 2. Profile Dialog Modal
    // ──────────────────────────────────────────────
    if (showProfileDialog) {
        ProfileDialog(
            user = uiState.currentUser,
            selectedVehicle = uiState.selectedVehicle,
            onDismiss = { showProfileDialog = false },
            onSignOut = {
                showProfileDialog = false
                viewModel.logout()
            },
            onSwitchAccount = {
                showProfileDialog = false
                viewModel.logout()
            }
        )
    }

    // ──────────────────────────────────────────────
    // 3. Main Authenticated App Layout
    // ──────────────────────────────────────────────
    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = VoltCardBg,
                contentColor = VoltCyan,
                tonalElevation = 8.dp
            ) {
                NavigationBarItem(
                    selected = uiState.currentTab == VoltNavTab.DASHBOARD,
                    onClick = { viewModel.selectTab(VoltNavTab.DASHBOARD) },
                    icon = { Icon(Icons.Default.Speed, contentDescription = "Dashboard", modifier = Modifier.size(20.dp)) },
                    label = { Text("Live", fontSize = 10.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = VoltCyan,
                        selectedTextColor = VoltCyan,
                        indicatorColor = VoltCyan.copy(alpha = 0.2f),
                        unselectedIconColor = VoltTextMuted,
                        unselectedTextColor = VoltTextMuted
                    )
                )

                NavigationBarItem(
                    selected = uiState.currentTab == VoltNavTab.TRIP_PLANNER,
                    onClick = { viewModel.selectTab(VoltNavTab.TRIP_PLANNER) },
                    icon = { Icon(Icons.Default.Navigation, contentDescription = "Journey", modifier = Modifier.size(20.dp)) },
                    label = { Text("Journey", fontSize = 10.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = VoltCyan,
                        selectedTextColor = VoltCyan,
                        indicatorColor = VoltCyan.copy(alpha = 0.2f),
                        unselectedIconColor = VoltTextMuted,
                        unselectedTextColor = VoltTextMuted
                    )
                )

                NavigationBarItem(
                    selected = uiState.currentTab == VoltNavTab.CHARGERS,
                    onClick = { viewModel.selectTab(VoltNavTab.CHARGERS) },
                    icon = { Icon(Icons.Default.EvStation, contentDescription = "Chargers", modifier = Modifier.size(20.dp)) },
                    label = { Text("Chargers", fontSize = 10.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = VoltCyan,
                        selectedTextColor = VoltCyan,
                        indicatorColor = VoltCyan.copy(alpha = 0.2f),
                        unselectedIconColor = VoltTextMuted,
                        unselectedTextColor = VoltTextMuted
                    )
                )

                NavigationBarItem(
                    selected = uiState.currentTab == VoltNavTab.SIMULATOR,
                    onClick = { viewModel.selectTab(VoltNavTab.SIMULATOR) },
                    icon = { Icon(Icons.Default.PlayArrow, contentDescription = "Sandbox", modifier = Modifier.size(20.dp)) },
                    label = { Text("Sandbox", fontSize = 10.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = VoltCyan,
                        selectedTextColor = VoltCyan,
                        indicatorColor = VoltCyan.copy(alpha = 0.2f),
                        unselectedIconColor = VoltTextMuted,
                        unselectedTextColor = VoltTextMuted
                    )
                )

                NavigationBarItem(
                    selected = uiState.currentTab == VoltNavTab.HEALTH,
                    onClick = { viewModel.selectTab(VoltNavTab.HEALTH) },
                    icon = { Icon(Icons.Default.BatteryChargingFull, contentDescription = "Health", modifier = Modifier.size(20.dp)) },
                    label = { Text("Health", fontSize = 10.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = VoltCyan,
                        selectedTextColor = VoltCyan,
                        indicatorColor = VoltCyan.copy(alpha = 0.2f),
                        unselectedIconColor = VoltTextMuted,
                        unselectedTextColor = VoltTextMuted
                    )
                )
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(VoltDarkBg)
                .padding(innerPadding)
        ) {
            when (uiState.currentTab) {
                VoltNavTab.DASHBOARD -> DashboardScreen(
                    uiState = uiState,
                    onSelectVehicle = { viewModel.selectVehicle(it) },
                    onTogglePreconditioning = { viewModel.togglePreconditioning() },
                    onToggleRangeMode = { viewModel.toggleRangeMode() },
                    onNavigateToTripPlanner = { viewModel.selectTab(VoltNavTab.TRIP_PLANNER) },
                    onOpenProfile = { showProfileDialog = true }
                )
                VoltNavTab.TRIP_PLANNER -> TripPlannerScreen(
                    uiState = uiState,
                    onCalculateTrip = { origin, dest, dist, oLat, oLng, dLat, dLng ->
                        viewModel.planTrip(origin, dest, dist, oLat, oLng, dLat, dLng)
                    },
                    onSelectStrategy = { viewModel.selectStrategy(it) },
                    onAcceptReroute = { viewModel.acceptReroute(it) },
                    onDismissReroute = { viewModel.dismissRerouteAlert() },
                    onTriggerSimulatedReroute = { viewModel.triggerSimulatedReroute() }
                )
                VoltNavTab.CHARGERS -> ChargingScreen(
                    uiState = uiState,
                    onToggleFastOnly = { viewModel.toggleFastChargerFilter() },
                    onToggleAvailableOnly = { viewModel.toggleAvailableOnlyFilter() },
                    onSimulateFastCharge = { station -> viewModel.simulateCharge(15, station.powerKw.toDouble()) },
                    onSubmitFeedback = { stId, rating, plugs, wait, func, comment ->
                        viewModel.submitStationFeedback(stId, rating, plugs, wait, func, comment)
                    }
                )
                VoltNavTab.SIMULATOR -> SimulatorScreen(
                    uiState = uiState,
                    onSimulateDrive = { dist, speed, temp -> viewModel.simulateDrive(dist, speed, temp) },
                    onSimulateCharge = { mins, power -> viewModel.simulateCharge(mins, power) },
                    onResetBaseline = { viewModel.resetSandboxBaseline() }
                )
                VoltNavTab.HEALTH -> HealthScreen(
                    uiState = uiState
                )
            }
        }
    }
}
