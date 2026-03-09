#include <Arduino.h>
#include <TFT_eSPI.h>

TFT_eSPI tft = TFT_eSPI();
void setup() {
    Serial.begin(115200);
    
    // FORCE BACKLIGHT ON
    pinMode(45, OUTPUT); 
    digitalWrite(45, HIGH); 

    tft.init();
    tft.setRotation(1);
    tft.fillScreen(TFT_BLUE); 

    tft.fillScreen(TFT_BLUE); 
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(3);
    tft.setCursor(10, 10);
    tft.println("GT TEST"); 
}
void loop() {
    // Generate random coordinates
    int x = random(0, 240);
    int y = random(0, 135);
    int size = random(1, 4);

    // Draw the snowflake
    tft.fillCircle(x, y, size, TFT_WHITE);
    
    // Slight delay so it looks like falling snow
    delay(50);

    // Reset screen occasionally so it doesn't turn solid white
    if (millis() % 10000 < 50) {
        tft.fillScreen(TFT_BLUE);
    }
}