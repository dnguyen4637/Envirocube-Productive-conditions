#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>

#define SCREEN_WIDTH 128  // OLED display width, in pixels
#define SCREEN_HEIGHT 128 // OLED display height, in pixels
#define OLED_RESET -1     // can set an oled reset pin if desired


const int MOSI_PIN = 35; 
const int MISO_PIN = 37;
const int SCK_PIN  = 36;
const int A3_PIN   = 15;  
const int A4_PIN   = 14;  
const int A5_PIN   = 8;  
// cosnt int 3.3V_pin   = 9;
const int CS_PIN = 14;

const int SCLK_PIN = 36;

const int DC_PIN = 15;

const int RST_PIN = 8;

Adafruit_SH1107 display = Adafruit_SH1107(SCREEN_WIDTH, SCREEN_HEIGHT, MOSI_PIN, SCLK_PIN, DC_PIN, RST_PIN, CS_PIN);





void drawGraphFrames() {
  // Screen is 128x128. Let's make 4 boxes of 60x60
  
  // 1. Top Left: Sound
  display.drawRect(0, 10, 60, 50, SH110X_WHITE);
  display.setCursor(2, 0);
  display.print("Snd");
  
  // 2. Top Right: Temp
  display.drawRect(68, 10, 60, 50, SH110X_WHITE);
  display.setCursor(70, 0);
  display.print("Tmp");

  // 3. Bottom Left: CO2
  display.drawRect(0, 75, 60, 50, SH110X_WHITE);
  display.setCursor(2, 65);
  display.print("CO2");

  // 4. Bottom Right: AQI
  display.drawRect(68, 75, 60, 50, SH110X_WHITE);
  display.setCursor(70, 65);
  display.print("AQI");
}




void setup() {
 Serial.begin(9600);
  delay(250); 

  if(!display.begin(0x3D, true)) {
    for(;;); 
  }

  display.clearDisplay();
  
  // Draw the UI Layout
  drawGraphFrames();
  
  // Example: Printing a warning if sound is high
  // In a real loop, you'd check: if (sound_db > 70)
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0); 
  display.println("ALERT: TOO LOUD!");

  display.display();
}




// --- ADD THIS ABOVE SETUP ---
int soundHistory[60]; // Array to store sound bars
int tempHistory[60];  // Array to store temp line points
int writeIndex = 0;   // Where we are in the graph

void loop() {
  // 1. Read Sensors
  int rawSound = analogRead(A3_PIN);
  int rawTemp  = analogRead(A4_PIN);

  // 2. Map values to fit inside our 50-pixel high boxes
  // ESP32 analog is 0-4095. We want 0-45 pixels height
  int soundBarHeight = map(rawSound, 0, 4095, 0, 45);
  int tempPixelY = map(rawTemp, 0, 4095, 55, 15); // Inverted: 55 is bottom, 15 is top

  // 3. Store in history (Shift values to the left to "scroll")
  for (int i = 0; i < 59; i++) {
    soundHistory[i] = soundHistory[i+1];
    tempHistory[i] = tempHistory[i+1];
  }
  soundHistory[59] = soundBarHeight;
  tempHistory[59] = tempPixelY;

  // 4. Redraw Screen
  display.clearDisplay();
  drawGraphFrames();

  // DRAW SOUND BARS (Top Left)
  for (int i = 0; i < 60; i++) {
    // drawFastVLine(x, y, height, color)
    display.drawFastVLine(i, 60 - soundHistory[i], soundHistory[i], SH110X_WHITE);
  }

  // DRAW TEMP LINE (Top Right)
  for (int i = 0; i < 59; i++) {
    // drawLine(x1, y1, x2, y2, color)
    display.drawLine(i + 68, tempHistory[i], i + 69, tempHistory[i+1], SH110X_WHITE);
  }

  display.display();
  delay(50); // Control the "scroll" speed
}