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
    // Dynamic placeholder data
    tft.setCursor(20, 140);
    tft.setTextSize(2);
    tft.setTextColor(TFT_YELLOW, TFT_BLACK);
    tft.printf("Temp: %d C  ", 24 + random(-1, 2));
    delay(1000);
}