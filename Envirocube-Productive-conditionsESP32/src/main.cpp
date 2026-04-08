#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <FastLED.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 128
#define OLED_RESET -1
#define NUM_STRIPS  5
#define NUM_LEDS    3
#define BRIGHTNESS  100 // Slightly lowered for power safety

CRGB leds[NUM_STRIPS][NUM_LEDS];

// Pin Definitions
const int MOSI_PIN = 35; 
const int SCK_PIN  = 36;
const int CS_PIN   = 14;
const int DC_PIN   = 15;
const int RST_PIN  = 8;

Adafruit_SH1107 display = Adafruit_SH1107(SCREEN_WIDTH, SCREEN_HEIGHT, MOSI_PIN, SCK_PIN, DC_PIN, RST_PIN, CS_PIN);

// Animation Buffers
int soundHistory[60];
int tempHistory[60];
int co2History[60];
int aqiHistory[60];
float frameCounter = 0; 

// Timer for "Slower" updates
unsigned long lastUpdate = 0;
const int updateInterval = 100; // Increase this (e.g., 200) to slow down the data drift even more

void setup() {
  // Safety: Limit power to 500mA since you mentioned power constraints
  FastLED.setMaxPowerInVoltsAndMilliamps(5, 500);

  FastLED.addLeds<WS2812B, 9,  GRB>(leds[0], NUM_LEDS);
  FastLED.addLeds<WS2812B, 10, GRB>(leds[1], NUM_LEDS);
  FastLED.addLeds<WS2812B, 11, GRB>(leds[2], NUM_LEDS);
  FastLED.addLeds<WS2812B, 12, GRB>(leds[3], NUM_LEDS);
  FastLED.addLeds<WS2812B, 13, GRB>(leds[4], NUM_LEDS);

  FastLED.setBrightness(BRIGHTNESS);
  FastLED.show();

  display.begin(0x3D, true);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);

  for(int i=0; i<60; i++) {
    soundHistory[i] = 30; tempHistory[i] = 30;
    co2History[i] = 30;   aqiHistory[i] = 30;
  }
}

// Function to set LED color based on 0-100 value
void updateStripColor(int stripIndex, int value) {
  // If value is high (e.g. > 80), turn Red. Otherwise, stay Green.
  CRGB statusColor = (value > 80) ? CRGB::Red : CRGB::Green;
  fill_solid(leds[stripIndex], NUM_LEDS, statusColor);
}

void drawBox(int x, int y, const char* label, int value, int history[]) {
  display.drawRect(x, y + 10, 60, 45, SH110X_WHITE);
  display.setCursor(x, y);
  display.print(label); display.print(":"); display.print(value);

  for (int i = 0; i < 58; i++) {
    int y1 = map(history[i], 0, 100, y + 53, y + 12);
    int y2 = map(history[i+1], 0, 100, y + 53, y + 12);
    display.drawLine(x + i + 1, y1, x + i + 2, y2, SH110X_WHITE);
  }
}

void loop() {
  // Only update data/LEDs every "updateInterval" milliseconds (Slows it down)
  if (millis() - lastUpdate >= updateInterval) {
    lastUpdate = millis();
    frameCounter += 0.1; // Reduced from 0.2 to slow down the wave motion

    // Generate Dummy Data
    int dummySound = 40 + (sin(frameCounter) * 45) + random(-5, 6); // Wider swing to hit "Red"
    int dummyTemp = 72 + (cos(frameCounter * 0.5) * 5);
    int dummyCO2 = 400 + (sin(frameCounter * 0.8) * 80);
    int dummyAQI = 15 + random(0, 4);

    // Shift Data
    for (int i = 0; i < 59; i++) {
      soundHistory[i] = soundHistory[i+1];
      tempHistory[i] = tempHistory[i+1];
      co2History[i] = co2History[i+1];
      aqiHistory[i] = aqiHistory[i+1];
    }
    
    // Scale and update history
    soundHistory[59] = constrain(dummySound, 0, 100);
    tempHistory[59] = map(dummyTemp, 60, 85, 0, 100); 
    co2History[59] = map(dummyCO2, 300, 550, 0, 100);
    aqiHistory[59] = map(dummyAQI, 0, 50, 0, 100);

    // --- LED COLOR LOGIC ---
    updateStripColor(0, soundHistory[59]); // Strip 0 reacts to Sound
    updateStripColor(1, tempHistory[59]);  // Strip 1 reacts to Temp
    updateStripColor(2, co2History[59]);   // Strip 2 reacts to CO2
    updateStripColor(3, aqiHistory[59]);   // Strip 3 reacts to AQI
    // Strip 4 can be a "General Health" indicator (Average of all)
    int avg = (soundHistory[59] + tempHistory[59] + co2History[59] + aqiHistory[59]) / 4;
    updateStripColor(4, avg);

    FastLED.show();
  }

  // Render Display (independent of data speed for smoothness)
  display.clearDisplay();
  drawBox(0, 0, "SND", map(soundHistory[59], 0, 100, 40, 100), soundHistory);
  drawBox(68, 0, "TMP", map(tempHistory[59], 0, 100, 60, 85), tempHistory);
  drawBox(0, 65, "CO2", map(co2History[59], 0, 100, 300, 550), co2History);
  drawBox(68, 65, "AQI", map(aqiHistory[59], 0, 100, 0, 50), aqiHistory);
  display.display();
}