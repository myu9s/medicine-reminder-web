#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <RTClib.h>
#include <vector>

// Konfigurasi WiFi
const char* ssid = "POCO F6";
const char* password = "123456789";

// Server URLs - menggunakan Glitch (gratis, tanpa kartu kredit)
const char* serverUrl = "https://medicine-reminder.glitch.me";  // Akan kita deploy ke Glitch
const char* apiUrl = "/api";

// Pin Definition untuk ESP32 CH340
#define BUZZER_PIN 13
#define LED_A_PIN 14    // LED untuk Laci A
#define LED_B_PIN 27    // LED untuk Laci B
#define LED_C_PIN 26    // LED untuk Laci C
#define BTN_A_PIN 32    // Button untuk Laci A
#define BTN_B_PIN 33    // Button untuk Laci B
#define BTN_C_PIN 25    // Button untuk Laci C

// I2C Pins untuk RTC DS3231
#define SDA_PIN 21
#define SCL_PIN 22

// RTC object
RTC_DS3231 rtc;

// Variabel untuk menyimpan alarm
struct Alarm {
    int hour;
    int minute;
    bool operator==(const Alarm& other) const {
        return hour == other.hour && minute == other.minute;
    }
};

std::vector<Alarm> alarmsA;
std::vector<Alarm> alarmsB;
std::vector<Alarm> alarmsC;

// Status alarm
bool isAlarmActiveA = false;
bool isAlarmActiveB = false;
bool isAlarmActiveC = false;

// Variables to track dismissed alarms
int lastDismissedHourA = -1;
int lastDismissedMinuteA = -1;
int lastDismissedHourB = -1;
int lastDismissedMinuteB = -1;
int lastDismissedHourC = -1;
int lastDismissedMinuteC = -1;

// Debouncing variables
unsigned long lastDebounceTimeA = 0;
unsigned long lastDebounceTimeB = 0;
unsigned long lastDebounceTimeC = 0;
unsigned long debounceDelay = 50;

// Timing variables
unsigned long lastAlarmCheck = 0;
unsigned long lastStatusPrint = 0;
unsigned long lastServerSync = 0;
const unsigned long ALARM_CHECK_INTERVAL = 1000;    // Check setiap 1 detik
const unsigned long STATUS_PRINT_INTERVAL = 5000;   // Print status setiap 5 detik
const unsigned long SERVER_SYNC_INTERVAL = 30000;   // Sync dengan server setiap 30 detik

void updateAlarmsFromServer() {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        
        // Gunakan endpoint API yang lengkap
        String url = String(serverUrl) + apiUrl + "/alarms";
        http.begin(url);
        
        // Tambahkan header untuk CORS dan Content-Type
        http.addHeader("Content-Type", "application/json");
        http.addHeader("Origin", "https://myu9s.github.io");
        
        int httpResponseCode = http.GET();
        
        if (httpResponseCode > 0) {
            String response = http.getString();
            Serial.println("Server response:");
            Serial.println(response);
            
            // Parse JSON response
            DynamicJsonDocument doc(1024);
            DeserializationError error = deserializeJson(doc, response);
            
            if (!error) {
                // Clear existing alarms
                alarmsA.clear();
                alarmsB.clear();
                alarmsC.clear();
                
                // Parse new alarms
                JsonArray laciA = doc["laciA"];
                JsonArray laciB = doc["laciB"];
                JsonArray laciC = doc["laciC"];
                
                // Add alarms for Laci A
                for (JsonObject alarmObj : laciA) {
                    Alarm alarm;
                    alarm.hour = alarmObj["hour"];
                    alarm.minute = alarmObj["minute"];
                    alarmsA.push_back(alarm);
                }
                
                // Add alarms for Laci B
                for (JsonObject alarmObj : laciB) {
                    Alarm alarm;
                    alarm.hour = alarmObj["hour"];
                    alarm.minute = alarmObj["minute"];
                    alarmsB.push_back(alarm);
                }
                
                // Add alarms for Laci C
                for (JsonObject alarmObj : laciC) {
                    Alarm alarm;
                    alarm.hour = alarmObj["hour"];
                    alarm.minute = alarmObj["minute"];
                    alarmsC.push_back(alarm);
                }
                
                printAllAlarms();
            }
        } else {
            Serial.print("Error code: ");
            Serial.println(httpResponseCode);
        }
        
        http.end();
    }
}

void printAllAlarms() {
    Serial.println("\nLaci A alarms:");
    for (const Alarm& alarm : alarmsA) {
        Serial.printf("%02d:%02d\n", alarm.hour, alarm.minute);
    }
    
    Serial.println("Laci B alarms:");
    for (const Alarm& alarm : alarmsB) {
        Serial.printf("%02d:%02d\n", alarm.hour, alarm.minute);
    }
    
    Serial.println("Laci C alarms:");
    for (const Alarm& alarm : alarmsC) {
        Serial.printf("%02d:%02d\n", alarm.hour, alarm.minute);
    }
    Serial.println();
}

void setup() {
    Serial.begin(115200);
    Serial.println("\nMedicine Reminder System Starting...");
    
    // Inisialisasi pin
    pinMode(BUZZER_PIN, OUTPUT);
    pinMode(LED_A_PIN, OUTPUT);
    pinMode(LED_B_PIN, OUTPUT);
    pinMode(LED_C_PIN, OUTPUT);
    pinMode(BTN_A_PIN, INPUT_PULLUP);
    pinMode(BTN_B_PIN, INPUT_PULLUP);
    pinMode(BTN_C_PIN, INPUT_PULLUP);
    
    // Test pin output
    Serial.println("Testing output pins...");
    digitalWrite(LED_A_PIN, HIGH);
    digitalWrite(LED_B_PIN, HIGH);
    digitalWrite(LED_C_PIN, HIGH);
    tone(BUZZER_PIN, 2000);
    delay(1000);
    digitalWrite(LED_A_PIN, LOW);
    digitalWrite(LED_B_PIN, LOW);
    digitalWrite(LED_C_PIN, LOW);
    noTone(BUZZER_PIN);
    Serial.println("Pin test completed");
    
    // Inisialisasi I2C untuk RTC
    Wire.begin(SDA_PIN, SCL_PIN);
    if (!rtc.begin()) {
        Serial.println("RTC tidak terdeteksi!");
        while (1) {
            digitalWrite(LED_A_PIN, HIGH);
            delay(100);
            digitalWrite(LED_A_PIN, LOW);
            delay(100);
        }
    }
    
    // Koneksi WiFi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nConnected to WiFi");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());
        
        // Initial sync
        updateAlarmsFromServer();
    } else {
        Serial.println("\nFailed to connect to WiFi");
        ESP.restart();
    }
}

void loop() {
    unsigned long currentMillis = millis();
    
    // Check alarms setiap 1 detik
    if (currentMillis - lastAlarmCheck >= ALARM_CHECK_INTERVAL) {
        checkAlarms();
        lastAlarmCheck = currentMillis;
    }
    
    // Print status setiap 5 detik
    if (currentMillis - lastStatusPrint >= STATUS_PRINT_INTERVAL) {
        DateTime now = rtc.now();
        Serial.printf("\nCurrent time: %02d:%02d:%02d\n", now.hour(), now.minute(), now.second());
        Serial.printf("Active alarms: A=%d, B=%d, C=%d\n", isAlarmActiveA, isAlarmActiveB, isAlarmActiveC);
        lastStatusPrint = currentMillis;
    }
    
    // Sync dengan server setiap 30 detik
    if (currentMillis - lastServerSync >= SERVER_SYNC_INTERVAL) {
        if (WiFi.status() == WL_CONNECTED) {
            updateAlarmsFromServer();
        } else {
            Serial.println("WiFi disconnected. Attempting to reconnect...");
            WiFi.begin(ssid, password);
        }
        lastServerSync = currentMillis;
    }
    
    handleButtons();
    handleActiveAlarms();
}

void checkAlarms() {
    DateTime now = rtc.now();
    int currentHour = now.hour();
    int currentMinute = now.minute();
    
    // Check Laci A
    for (const Alarm& alarm : alarmsA) {
        if (alarm.hour == currentHour && alarm.minute == currentMinute) {
            // Only activate if not already active and not dismissed in this minute
            if (!isAlarmActiveA && (currentHour != lastDismissedHourA || currentMinute != lastDismissedMinuteA)) {
                Serial.printf("*** MATCH FOUND FOR LACI A: %02d:%02d ***\n", currentHour, currentMinute);
                isAlarmActiveA = true;
            }
        }
    }
    
    // Check Laci B
    for (const Alarm& alarm : alarmsB) {
        if (alarm.hour == currentHour && alarm.minute == currentMinute) {
            // Only activate if not already active and not dismissed in this minute
            if (!isAlarmActiveB && (currentHour != lastDismissedHourB || currentMinute != lastDismissedMinuteB)) {
                Serial.printf("*** MATCH FOUND FOR LACI B: %02d:%02d ***\n", currentHour, currentMinute);
                isAlarmActiveB = true;
            }
        }
    }
    
    // Check Laci C
    for (const Alarm& alarm : alarmsC) {
        if (alarm.hour == currentHour && alarm.minute == currentMinute) {
            // Only activate if not already active and not dismissed in this minute
            if (!isAlarmActiveC && (currentHour != lastDismissedHourC || currentMinute != lastDismissedMinuteC)) {
                Serial.printf("*** MATCH FOUND FOR LACI C: %02d:%02d ***\n", currentHour, currentMinute);
                isAlarmActiveC = true;
            }
        }
    }
    
    // Reset dismissed time when minute changes
    static int lastMinute = -1;
    if (currentMinute != lastMinute) {
        if (lastDismissedMinuteA == lastMinute) {
            lastDismissedHourA = -1;
            lastDismissedMinuteA = -1;
        }
        if (lastDismissedMinuteB == lastMinute) {
            lastDismissedHourB = -1;
            lastDismissedMinuteB = -1;
        }
        if (lastDismissedMinuteC == lastMinute) {
            lastDismissedHourC = -1;
            lastDismissedMinuteC = -1;
        }
        lastMinute = currentMinute;
    }
}

// Button state variables
bool btnAPrevState = HIGH;
bool btnBPrevState = HIGH;
bool btnCPrevState = HIGH;
unsigned long btnAPressStart = 0;
unsigned long btnBPressStart = 0;
unsigned long btnCPressStart = 0;
const unsigned long LONG_PRESS_TIME = 3000; // 3 detik untuk mematikan alarm

void handleButtons() {
    // Read current button states
    bool btnAState = digitalRead(BTN_A_PIN);
    bool btnBState = digitalRead(BTN_B_PIN);
    bool btnCState = digitalRead(BTN_C_PIN);
    unsigned long currentTime = millis();
    DateTime now = rtc.now();

    // Button A
    if (btnAState != btnAPrevState) {
        if ((currentTime - lastDebounceTimeA) > debounceDelay) {
            if (btnAState == LOW) { // Button pressed
                btnAPressStart = currentTime;
            } else { // Button released
                if (isAlarmActiveA && (currentTime - btnAPressStart >= LONG_PRESS_TIME)) {
                    isAlarmActiveA = false;
                    digitalWrite(LED_A_PIN, LOW);
                    if (!isAlarmActiveB && !isAlarmActiveC) {
                        noTone(BUZZER_PIN);
                    }
                    // Record dismissed time
                    lastDismissedHourA = now.hour();
                    lastDismissedMinuteA = now.minute();
                    Serial.println("Alarm A dismissed after long press");
                }
            }
            lastDebounceTimeA = currentTime;
        }
        btnAPrevState = btnAState;
    }

    // Button B
    if (btnBState != btnBPrevState) {
        if ((currentTime - lastDebounceTimeB) > debounceDelay) {
            if (btnBState == LOW) { // Button pressed
                btnBPressStart = currentTime;
            } else { // Button released
                if (isAlarmActiveB && (currentTime - btnBPressStart >= LONG_PRESS_TIME)) {
                    isAlarmActiveB = false;
                    digitalWrite(LED_B_PIN, LOW);
                    if (!isAlarmActiveA && !isAlarmActiveC) {
                        noTone(BUZZER_PIN);
                    }
                    // Record dismissed time
                    lastDismissedHourB = now.hour();
                    lastDismissedMinuteB = now.minute();
                    Serial.println("Alarm B dismissed after long press");
                }
            }
            lastDebounceTimeB = currentTime;
        }
        btnBPrevState = btnBState;
    }

    // Button C
    if (btnCState != btnCPrevState) {
        if ((currentTime - lastDebounceTimeC) > debounceDelay) {
            if (btnCState == LOW) { // Button pressed
                btnCPressStart = currentTime;
            } else { // Button released
                if (isAlarmActiveC && (currentTime - btnCPressStart >= LONG_PRESS_TIME)) {
                    isAlarmActiveC = false;
                    digitalWrite(LED_C_PIN, LOW);
                    if (!isAlarmActiveA && !isAlarmActiveB) {
                        noTone(BUZZER_PIN);
                    }
                    // Record dismissed time
                    lastDismissedHourC = now.hour();
                    lastDismissedMinuteC = now.minute();
                    Serial.println("Alarm C dismissed after long press");
                }
            }
            lastDebounceTimeC = currentTime;
        }
        btnCPrevState = btnCState;
    }
}

void handleActiveAlarms() {
    static unsigned long lastBlink = 0;
    static bool blinkState = false;
    
    if (isAlarmActiveA || isAlarmActiveB || isAlarmActiveC) {
        if (millis() - lastBlink >= 500) {
            blinkState = !blinkState;
            
            if (isAlarmActiveA) {
                digitalWrite(LED_A_PIN, blinkState);
            }
            if (isAlarmActiveB) {
                digitalWrite(LED_B_PIN, blinkState);
            }
            if (isAlarmActiveC) {
                digitalWrite(LED_C_PIN, blinkState);
            }
            
            if (blinkState) {
                tone(BUZZER_PIN, 2000);
            } else {
                tone(BUZZER_PIN, 1500);
            }
            
            lastBlink = millis();
        }
    } else {
        digitalWrite(LED_A_PIN, LOW);
        digitalWrite(LED_B_PIN, LOW);
        digitalWrite(LED_C_PIN, LOW);
        noTone(BUZZER_PIN);
    }
}

void syncTimeFromServer() {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        String timeEndpoint = String(serverUrl) + apiUrl + "/time";  
        http.begin(timeEndpoint);
        
        int httpCode = http.GET();
        
        if (httpCode == HTTP_CODE_OK) {
            String payload = http.getString();
            DynamicJsonDocument doc(200);
            DeserializationError error = deserializeJson(doc, payload);
            
            if (!error) {
                int hour = doc["hour"];
                int minute = doc["minute"];
                int second = doc["second"];
                
                // Update RTC
                DateTime now = rtc.now();
                rtc.adjust(DateTime(now.year(), now.month(), now.day(), hour, minute, second));
                Serial.printf("Time synced - %02d:%02d:%02d\n", hour, minute, second);
            }
        } else {
            Serial.print("Error getting time: ");
            Serial.println(httpCode);
        }
        
        http.end();
    }
}
