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



void setup() {
  Serial.begin(9600);

  delay(250); // wait for the OLED to power up

  // Show image buffer on the display hardware.
  // Since the buffer is intialized with an Adafruit splashscreen
  // internally, this will display the splashscreen.

  display.begin(0x3D, true); // Address 0x3D default
 //display.setContrast (0); // dim display

  display.clearDisplay(); 
  display.setTextSize(2);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(10, 10);
  display.println("ALERT: It is Loud ");
  display.display();
}

void loop() {
  
}




