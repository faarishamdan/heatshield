package com.heatshield.ai.util

import android.content.Context
import android.content.Intent
import android.net.Uri

object SosSmsHelper {
    /**
     * Opens the device SMS composer with a pre-filled emergency message.
     * The worker reviews and sends or cancels manually inside the SMS app.
     */
    fun openSmsComposer(
        context: Context,
        phoneNumber: String,
        workerName: String,
        siteLocation: String,
        customMessage: String,
        latestTelemetry: SensorTelemetry?
    ): Boolean {
        val cleanPhone = phoneNumber.replace(Regex("[^0-9+]"), "")
        val telemetrySummary = if (latestTelemetry != null) {
            "Latest Sensor: ${latestTelemetry.temperature}C, ${latestTelemetry.humidity}% RH, Heat Index ${latestTelemetry.heatIndex}C, Motion ${latestTelemetry.activityLabel}."
        } else {
            "No live sensor reading attached."
        }

        val body = buildString {
            appendLine("HEATSHIELD SOS ALERT")
            appendLine("Worker: $workerName")
            if (siteLocation.isNotBlank()) appendLine("Site: $siteLocation")
            appendLine("Message: $customMessage")
            append(telemetrySummary)
        }

        val intent = Intent(Intent.ACTION_SENDTO).apply {
            data = Uri.parse("smsto:${Uri.encode(cleanPhone)}")
            putExtra("sms_body", body)
        }

        return if (intent.resolveActivity(context.packageManager) != null) {
            context.startActivity(intent)
            true
        } else {
            false
        }
    }
}
