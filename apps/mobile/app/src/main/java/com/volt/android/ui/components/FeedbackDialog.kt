package com.volt.android.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.volt.android.data.models.ChargingStation
import com.volt.android.ui.theme.VoltAmber
import com.volt.android.ui.theme.VoltCardBg
import com.volt.android.ui.theme.VoltCardBorder
import com.volt.android.ui.theme.VoltCardElevated
import com.volt.android.ui.theme.VoltCyan
import com.volt.android.ui.theme.VoltEmerald
import com.volt.android.ui.theme.VoltTextPrimary
import com.volt.android.ui.theme.VoltTextSecondary

@Composable
fun FeedbackDialog(
    station: ChargingStation,
    onDismiss: () -> Unit,
    onSubmit: (rating: Int, plugsObserved: Int, waitMins: Int, functional: Boolean, comment: String?) -> Unit
) {
    var rating by remember { mutableIntStateOf(5) }
    var plugsObserved by remember { mutableIntStateOf(station.availablePlugs) }
    var waitTimeMinutes by remember { mutableIntStateOf(0) }
    var isFunctional by remember { mutableStateOf(true) }
    var comment by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = VoltCardBg),
            border = BorderStroke(1.dp, VoltCyan)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                // Title
                Text(
                    text = "DRIVER OBSERVATION REPORT",
                    color = VoltCyan,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Text(
                    text = station.name,
                    color = VoltTextPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${station.operator} • ${station.address}",
                    color = VoltTextSecondary,
                    fontSize = 12.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Star Rating
                Text(
                    text = "Overall Station Experience",
                    color = VoltTextSecondary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    for (i in 1..5) {
                        Icon(
                            imageVector = if (i <= rating) Icons.Default.Star else Icons.Default.StarBorder,
                            contentDescription = "Star $i",
                            tint = if (i <= rating) VoltAmber else VoltTextSecondary,
                            modifier = Modifier
                                .size(28.dp)
                                .clickable { rating = i }
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = when (rating) {
                            5 -> "Excellent (5/5)"
                            4 -> "Good (4/5)"
                            3 -> "Average (3/5)"
                            2 -> "Poor (2/5)"
                            else -> "Terrible (1/5)"
                        },
                        color = VoltAmber,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Plugs available & Wait Time Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Plugs
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Plugs Available",
                            color = VoltTextSecondary,
                            fontSize = 11.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedButton(
                                onClick = { if (plugsObserved > 0) plugsObserved-- },
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                modifier = Modifier.size(32.dp)
                            ) {
                                Text("-", color = VoltCyan, fontWeight = FontWeight.Bold)
                            }
                            Text(
                                text = "$plugsObserved",
                                color = VoltTextPrimary,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 12.dp)
                            )
                            OutlinedButton(
                                onClick = { if (plugsObserved < 20) plugsObserved++ },
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                modifier = Modifier.size(32.dp)
                            ) {
                                Text("+", color = VoltCyan, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    // Wait minutes
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Queue Wait (min)",
                            color = VoltTextSecondary,
                            fontSize = 11.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedButton(
                                onClick = { if (waitTimeMinutes >= 5) waitTimeMinutes -= 5 },
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                modifier = Modifier.size(32.dp)
                            ) {
                                Text("-", color = VoltAmber, fontWeight = FontWeight.Bold)
                            }
                            Text(
                                text = "$waitTimeMinutes m",
                                color = VoltTextPrimary,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp)
                            )
                            OutlinedButton(
                                onClick = { waitTimeMinutes += 5 },
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                modifier = Modifier.size(32.dp)
                            ) {
                                Text("+", color = VoltAmber, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Charger Functional Toggle
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Charger Fully Functional?",
                            color = VoltTextPrimary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = if (isFunctional) "Dispensing power at rated kW" else "Faulty plug or communication error",
                            color = if (isFunctional) VoltEmerald else VoltAmber,
                            fontSize = 11.sp
                        )
                    }

                    Switch(
                        checked = isFunctional,
                        onCheckedChange = { isFunctional = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.Black,
                            checkedTrackColor = VoltEmerald,
                            uncheckedThumbColor = Color.White,
                            uncheckedTrackColor = VoltCardElevated
                        )
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Comment
                OutlinedTextField(
                    value = comment,
                    onValueChange = { comment = it },
                    label = { Text("Driver Notes (Optional)", color = VoltTextSecondary) },
                    placeholder = { Text("e.g. Clean station, stall #3 screen error", color = VoltTextSecondary.copy(alpha = 0.5f)) },
                    maxLines = 2,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = VoltTextPrimary,
                        unfocusedTextColor = VoltTextPrimary,
                        focusedBorderColor = VoltCyan,
                        unfocusedBorderColor = VoltCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Action buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f),
                        border = BorderStroke(1.dp, VoltCardBorder)
                    ) {
                        Text("Cancel", color = VoltTextSecondary)
                    }

                    Button(
                        onClick = {
                            onSubmit(
                                rating,
                                plugsObserved,
                                waitTimeMinutes,
                                isFunctional,
                                comment.ifBlank { null }
                            )
                            onDismiss()
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = VoltCyan),
                        modifier = Modifier.weight(1.3f)
                    ) {
                        Text("Submit Report", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
