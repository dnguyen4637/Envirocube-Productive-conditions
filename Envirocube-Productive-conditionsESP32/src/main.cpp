#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>

// Standard S3 I2C Pins
#define i2c_Address 0x3c 
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1   // Reset pin # (or -1 if sharing Arduino reset pin)

Adafruit_SH1106G display = Adafruit_SH1106G(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Initialize I2C with your specific S3 pins
  // (SDA is GPIO 35, SCL is GPIO 36 based on your previous config)
  Wire.begin(35, 36);

  if(!display.begin(i2c_Address, true)) {
    Serial.println("SH110X allocation failed");
    for(;;);
  }

  display.clearDisplay();
  display.display();
  Serial.println(">>> Envirocube OLED: Let it snow!");
}

void loop() {
  int x = random(0, display.width());
  int y = random(0, display.height());
  
  // Draw a snowflake (a single pixel or small circle)
  display.drawPixel(x, y, SH110X_WHITE);
  display.display();
  
  delay(50);

  // Clear every 10 seconds
  if (millis() % 10000 < 50) {
    display.clearDisplay();
  }
}