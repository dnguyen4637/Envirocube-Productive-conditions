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

// Specific color functions for each metric
CRGB getSoundColor(int db) {
  if (db > 60) return CRGB::Red;
  if (db > 50) return CRGB::Yellow;
  return CRGB::Green;
}

CRGB getTempColor(int f) {
  if (f > 79) return CRGB::Red;
  if (f > 75) return CRGB::Yellow;
  return CRGB::Green;
}

CRGB getCO2Color(int ppm) {
  if (ppm > 1500) return CRGB::Red;
  if (ppm > 800) return CRGB::Yellow;
  return CRGB::Green;
}

CRGB getPM25Color(int val) {
  if (val > 20) return CRGB::Red;
  if (val > 5) return CRGB::Yellow;
  return CRGB::Green;
}

// Individual update functions for each sensor/metric
void updateSoundLED(int db) {
  fill_solid(leds[0], NUM_LEDS, getSoundColor(db));
}

void updateTempLED(int f) {
  fill_solid(leds[1], NUM_LEDS, getTempColor(f));
}

void updateCO2LED(int ppm) {
  fill_solid(leds[2], NUM_LEDS, getCO2Color(ppm));
}

void updatePM25LED(int val) {
  fill_solid(leds[3], NUM_LEDS, getPM25Color(val));
}

void updateGeneralHealthLED(int sound, int temp, int co2, int pm25) {
  CRGB sC = getSoundColor(sound);
  CRGB tC = getTempColor(temp);
  CRGB cC = getCO2Color(co2);
  CRGB pC = getPM25Color(pm25);

  // If any is Red, General is Red. Else if any is Yellow, General is Yellow.
  CRGB healthColor = CRGB::Green;
  if (sC == CRGB::Red || tC == CRGB::Red || cC == CRGB::Red || pC == CRGB::Red) {
    healthColor = CRGB::Red;
  } else if (sC == CRGB::Yellow || tC == CRGB::Yellow || cC == CRGB::Yellow || pC == CRGB::Yellow) {
    healthColor = CRGB::Yellow;
  }
  fill_solid(leds[4], NUM_LEDS, healthColor);
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

    // Generate Dummy Data (Raw values)
    int rawSound = 45 + (sin(frameCounter) * 25) + random(-2, 3);   // 20-70 dB range
    int rawTemp = 72 + (cos(frameCounter * 0.5) * 10);             // 62-82 °F range
    int rawCO2 = 1000 + (sin(frameCounter * 0.8) * 800);           // 200-1800 ppm range
    int rawPM25 = 15 + (sin(frameCounter * 1.2) * 15) + random(0, 5); // 0-35 µg/m³ range

    // Shift Data
    for (int i = 0; i < 59; i++) {
      soundHistory[i] = soundHistory[i+1];
      tempHistory[i] = tempHistory[i+1];
      co2History[i] = co2History[i+1];
      aqiHistory[i] = aqiHistory[i+1];
    }
    
    // Scale raw values to 0-100 for the history graphs
    soundHistory[59] = map(rawSound, 30, 80, 0, 100);
    tempHistory[59] = map(rawTemp, 60, 90, 0, 100);
    co2History[59] = map(rawCO2, 400, 2000, 0, 100);
    aqiHistory[59] = map(rawPM25, 0, 50, 0, 100);

    // --- LED COLOR LOGIC (Using Raw Values) ---
    updateSoundLED(rawSound);
    updateTempLED(rawTemp);
    updateCO2LED(rawCO2);
    updatePM25LED(rawPM25);
    updateGeneralHealthLED(rawSound, rawTemp, rawCO2, rawPM25);

    FastLED.show();
  }

  // Render Display (independent of data speed for smoothness)
  display.clearDisplay();
  drawBox(0, 0, "SND", map(soundHistory[59], 0, 100, 30, 80), soundHistory);
  drawBox(68, 0, "TMP", map(tempHistory[59], 0, 100, 60, 90), tempHistory);
  drawBox(0, 65, "CO2", map(co2History[59], 0, 100, 400, 2000), co2History);
  drawBox(68, 65, "PM2.5", map(aqiHistory[59], 0, 100, 0, 50), aqiHistory);
  display.display();
}