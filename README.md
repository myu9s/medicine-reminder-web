# Medicine Reminder IoT System

A web-based IoT system for managing medication reminders across three storage drawers using ESP32.

## Features

- Web interface for managing medication schedules
- Three separate storage drawers with LED indicators
- Real-time alarm system with buzzer
- Secure login system
- Mobile-responsive design

## Hardware Requirements

- ESP32 CH340 microcontroller
- RTC (Real-Time Clock) Module
- Buzzer (GPIO 13)
- 3 LEDs (Laci A: GPIO 14, Laci B: GPIO 27, Laci C: GPIO 26)
- 3 Buttons (Laci A: GPIO 32, Laci B: GPIO 33, Laci C: GPIO 25)
- I2C Communication (SDA: GPIO 21, SCL: GPIO 22)

## Software Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/[USERNAME]/medicine-reminder-web.git
   cd medicine-reminder-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Upload the Arduino code:
   - Open `MedicineReminder.ino` in Arduino IDE
   - Install required libraries:
     * WiFi
     * HTTPClient
     * ArduinoJson
     * RTClib
   - Update WiFi credentials and server URL
   - Upload to ESP32

## Usage

1. Access the web interface at `https://[USERNAME].github.io/medicine-reminder-web`
2. Login with default credentials:
   - Username: admin
   - Password: password
3. Add medication schedules for each drawer
4. When an alarm triggers:
   - LED for corresponding drawer will blink
   - Buzzer will sound
   - Press and hold button for 3 seconds to dismiss alarm

## Security

- JWT-based authentication
- Protected API endpoints
- HTTPS support
- Session management

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
