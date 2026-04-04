#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <Adafruit_NeoPixel.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 128
#define OLED_RESET -1

// Pin Definitions (Keep your existing wiring)
const int MOSI_PIN = 35; 
const int SCK_PIN  = 36;
const int CS_PIN   = 14;
const int DC_PIN   = 15;
const int RST_PIN  = 8;
const int D13_PIN  = 13;
const int D12_PIN  = 12;
const int D11_PIN  = 11;
const int D10_PIN  = 10;
const int D9_PIN   = 9;

// WS2812B configuration
const uint16_t LED_COUNT = 1; // LEDs per data pin
const uint8_t MAX_BRIGHTNESS = 64; // 25% brightness cap to reduce power draw

Adafruit_NeoPixel pixelsD13(LED_COUNT, D13_PIN, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel pixelsD12(LED_COUNT, D12_PIN, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel pixelsD11(LED_COUNT, D11_PIN, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel pixelsD10(LED_COUNT, D10_PIN, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel pixelsD9(LED_COUNT, D9_PIN, NEO_GRB + NEO_KHZ800);

Adafruit_NeoPixel* strips[] = {&pixelsD13, &pixelsD12, &pixelsD11, &pixelsD10, &pixelsD9};
const uint8_t STRIP_COUNT = sizeof(strips) / sizeof(strips[0]);

Adafruit_SH1107 display = Adafruit_SH1107(SCREEN_WIDTH, SCREEN_HEIGHT, MOSI_PIN, SCK_PIN, DC_PIN, RST_PIN, CS_PIN);

// Animation Buffers
int soundHistory[60];
int tempHistory[60];
int co2History[60];
int aqiHistory[60];
float frameCounter = 0; // Used to create smooth wave motion

void setup() {
  for (uint8_t s = 0; s < STRIP_COUNT; s++) {
    strips[s]->begin();
    strips[s]->setBrightness(MAX_BRIGHTNESS);
    for (uint16_t i = 0; i < LED_COUNT; i++) {
      strips[s]->setPixelColor(i, strips[s]->Color(0, 255, 0));
    }
    strips[s]->show();
  }

  display.begin(0x3D, true);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);

  // Fill arrays with mid-point starting data
  for(int i=0; i<60; i++) {
    soundHistory[i] = 30; 
    tempHistory[i] = 30;
    co2History[i] = 30;
    aqiHistory[i] = 30;
  }
}

void drawBox(int x, int y, const char* label, int value, int history[]) {
  // Draw the Frame
  display.drawRect(x, y + 10, 60, 45, SH110X_WHITE);
  
  // Draw the Header Text
  display.setCursor(x, y);
  display.print(label);
  display.print(":");
  display.print(value);

  // Draw the Animated Line
  for (int i = 0; i < 58; i++) {
    // We map the 0-100 dummy range to the 45-pixel box height
    int y1 = map(history[i], 0, 100, y + 53, y + 12);
    int y2 = map(history[i+1], 0, 100, y + 53, y + 12);
    display.drawLine(x + i + 1, y1, x + i + 2, y2, SH110X_WHITE);
  }
}

void loop() {
  frameCounter += 0.2; // Increase this to make the "waves" faster

  // --- GENERATE DUMMY DATA ---
  // Sound: Erratic/Spiky (Sine + Random)
  int dummySound = 40 + (sin(frameCounter) * 20) + random(-5, 6);
  
  // Temp: Very Smooth (Slow Sine)
  int dummyTemp = 72 + (cos(frameCounter * 0.5) * 5);
  
  // CO2: Drifting upwards
  int dummyCO2 = 400 + (sin(frameCounter * 0.8) * 50);

  // AQI: Mostly stable with tiny jitters
  int dummyAQI = 15 + random(0, 4);

  // --- SHIFT DATA ARRAYS ---
  for (int i = 0; i < 59; i++) {
    soundHistory[i] = soundHistory[i+1];
    tempHistory[i] = tempHistory[i+1];
    co2History[i] = co2History[i+1];
    aqiHistory[i] = aqiHistory[i+1];
  }
  
  // Update with new values (scaled to 0-100 for the graph logic)
  soundHistory[59] = constrain(dummySound, 0, 100);
  tempHistory[59] = map(dummyTemp, 60, 85, 0, 100); 
  co2History[59] = map(dummyCO2, 300, 500, 0, 100);
  aqiHistory[59] = map(dummyAQI, 0, 50, 0, 100);

  // --- RENDERING ---
  display.clearDisplay();
  
  drawBox(0, 0, "SND", dummySound, soundHistory);      // Top Left
  drawBox(68, 0, "TMP", dummyTemp, tempHistory);      // Top Right
  drawBox(0, 65, "CO2", dummyCO2, co2History);       // Bottom Left
  drawBox(68, 65, "AQI", dummyAQI, aqiHistory);      // Bottom Right

  display.display();
  delay(30); 
}