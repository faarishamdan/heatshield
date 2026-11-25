package com.heatshield.ai

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.heatshield.ai.ble.BleHeatShieldManager
import com.heatshield.ai.ble.BleStatus
import com.heatshield.ai.util.SosSmsHelper

private val NavyPrimary = Color(0xFF0B1F3A)
private val TealAccent = Color(0xFF0D9488)
private val OrangeWarning = Color(0xFFEA580C)
private val RedSos = Color(0xFFDC2626)

class MainActivity : ComponentActivity() {
    private lateinit var bleManager: BleHeatShieldManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        bleManager = BleHeatShieldManager(applicationContext)

        setContent {
            MaterialTheme(
                colorScheme = lightColorScheme(
                    primary = NavyPrimary,
                    secondary = TealAccent,
                    tertiary = OrangeWarning
                )
            ) {
                HeatShieldMobileApp(bleManager = bleManager)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        bleManager.disconnect()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HeatShieldMobileApp(bleManager: BleHeatShieldManager) {
    val context = LocalContext.current
    val bleStatus by bleManager.status.collectAsState()
    val bleError by bleManager.error.collectAsState()
    val telemetry by bleManager.telemetry.collectAsState()

    var workerName by remember { mutableStateOf("Field Worker") }
    var siteLocation by remember { mutableStateOf("Sector B — Construction Zone") }
    var emergencyPhone by remember { mutableStateOf("") }
    var showSosDialog by remember { mutableStateOf(false) }
    var warningThresholdC by remember { mutableFloatStateOf(32f) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { granted ->
        if (granted.values.all { it }) {
            bleManager.startScanAndConnect()
        }
    }

    val requestBleConnect = {
        val perms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT
            )
        } else {
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        permissionLauncher.launch(perms)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("HEATSHIELD AI", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = NavyPrimary,
                    titleContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF8FAFC))
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // BLE Status Card
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("ESP32-WROOM-DA BLE Status: ${bleStatus.name}", fontWeight = FontWeight.SemiBold)
                    Text(
                        text = if (telemetry?.isLiveHardware == true) "Receiving Live Hardware Data" else "No Live Hardware Connected",
                        fontSize = 12.sp,
                        color = if (telemetry?.isLiveHardware == true) TealAccent else Color(0xFF64748B)
                    )
                    bleError?.let {
                        Text(it, color = RedSos, fontSize = 12.sp)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                if (bleStatus == BleStatus.CONNECTED) bleManager.disconnect()
                                else requestBleConnect()
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = TealAccent)
                        ) {
                            Text(if (bleStatus == BleStatus.CONNECTED) "Disconnect" else "Pair ESP32")
                        }
                    }
                }
            }

            // Telemetry Metrics
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Environmental & Motion Telemetry", fontWeight = FontWeight.SemiBold)
                    Text("Temperature: ${telemetry?.temperature?.let { "$it °C" } ?: "--.- °C"}")
                    Text("Humidity: ${telemetry?.humidity?.let { "$it %" } ?: "--.- %"}")
                    Text(
                        text = "Heat Index: ${telemetry?.heatIndex?.let { "$it °C" } ?: "--.- °C"}",
                        fontWeight = FontWeight.Bold,
                        color = if ((telemetry?.heatIndex ?: 0.0) >= warningThresholdC) OrangeWarning else NavyPrimary
                    )
                    Text("Activity (MPU6050): ${telemetry?.activityLabel ?: "No Signal"}")
                    Text(
                        text = "Heat Index is an environmental estimate, not core body temperature or WBGT.",
                        fontSize = 11.sp,
                        color = Color(0xFF475569)
                    )
                }
            }

            // Worker & Emergency Contact Configuration
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Worker & Emergency Contact", fontWeight = FontWeight.SemiBold)
                    OutlinedTextField(
                        value = workerName,
                        onValueChange = { workerName = it },
                        label = { Text("Worker Name") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = emergencyPhone,
                        onValueChange = { emergencyPhone = it },
                        label = { Text("Emergency Contact Phone") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // Large SOS Button
            Button(
                onClick = { showSosDialog = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(84.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = RedSos)
            ) {
                Text("SOS EMERGENCY SMS", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
        }
    }

    if (showSosDialog) {
        AlertDialog(
            onDismissRequest = { showSosDialog = false },
            title = { Text("Open SMS Composer?") },
            text = {
                Text(
                    "This opens your phone's SMS app pre-filled with $workerName's alert. " +
                        "No message is sent automatically until you press Send in the SMS app."
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showSosDialog = false
                        SosSmsHelper.openSmsComposer(
                            context = context,
                            phoneNumber = emergencyPhone,
                            workerName = workerName,
                            siteLocation = siteLocation,
                            customMessage = "Requesting immediate heat-safety assistance.",
                            latestTelemetry = telemetry
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = RedSos)
                ) {
                    Text("Open SMS App")
                }
            },
            dismissButton = {
                TextButton(onClick = { showSosDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
