#include "rcfirst.h"

// RF comm stuff
#include <SPI.h>
#include <RF24.h>
// #include <nRF24L01.h>
#include <printf.h>

#include <Servo.h>

#define USE_PRINTF true
#define PRINTF(format, ...) {       \
    INCLUDE_GUARD(USE_PRINTF, {     \
        printf(format, __VA_ARGS__) \
    })                              \
}

// ESC's use Servo-like PWM for control
Servo throttle;

// Serial console input / read buffer
char input_buff[INPUT_BUFF_SIZE];

// Serial console input / read buffer
byte rx_buff[PAYLOAD_SIZE + 1] = {0};

// Instantiate nRF24L01 radio transceiver
RF24 radio(PIN_CE, PIN_CSN);

// TODO: Make 2way communication possible for sensor data collection.
const byte address[] = "First";

bool transmitter = false;
bool radio_initialized = false;

bool strimatch(const char *a, const char *b) {
    return !strcasecmp(a, b);
}

// TODO: Maybe move that to header ?
const char *modeNames[] = {"Transmitter", "Receiver"};

void set_mode(e_mode mode_target) {
    static e_mode mode_current = none;

    if (mode_target == mode_current) {
        Serial.println("Already in requested mode.");
        return;
    }
    Serial.write("Switch to ");
    Serial.write(modeNames[mode_target]);
    Serial.println(" mode...");

    switch (mode_target) {
        case mode_tx:
            radio.stopListening();
            radio.closeReadingPipe(0);
            radio.openWritingPipe(address);
            transmitter = true;
            break;
        case mode_rx:
            radio.openReadingPipe(0, address);
            radio.startListening();
            transmitter = false;
            break;
        default:
            break;
    }
    mode_current = mode_target;
    Serial.println("Mode switch done.");
}

void process_input(char input[], size_t length) {
    // Check for RX / TX instruction
    if (strimatch(input, "tx") || strimatch(input, "transmit")) {
        set_mode(mode_tx);
        return;
    } else if (strimatch(input, "rx") || strimatch(input, "receive")) {
        set_mode(mode_rx);
        return;
    }
    // Dump radio status
    if (strimatch(input, "radio") || strimatch(input, "status")) {
        INCLUDE_GUARD(USE_PRINTF, {
            radio.printPrettyDetails();
        })
        Serial.print("Initialized: ");
        Serial.println(radio_initialized ? "true" : "false");
        Serial.print("Role: ");
        Serial.println(transmitter ? "TX" : "RX");
        return;
    }
    // Tx specific commands (message sending)
    if (transmitter) {
        if (!memcmp(input, "M ", sizeof(char) * 2)
            || !memcmp(input, "m ", sizeof(char) * 2)) {
            if (strlen(input) > 2) {
                PRINTF("Sending payload: [%s] (%d bytes)\n", input + 2, strlen(input + 2))
                if (!radio.write(input + 2, sizeof(char) * strlen(input + 2))) {
                    Serial.println("Radio write error.");
                }
            } else { Serial.println("No message payload."); }
            return;
        }
    }

    Serial.println("Unrecognized input.");
    memset(input_buff, 0, INPUT_BUFF_SIZE);
}

void setup() {
    INCLUDE_GUARD(USE_PRINTF, {
        printf_begin();
    })
    pinMode(LED_BUILTIN, OUTPUT);
    pinMode(LED_TX, OUTPUT);
    pinMode(LED_RX, OUTPUT);

    Serial.begin(SERIAL_BAUDRATE);
    Serial.setTimeout(SERIAL_TIMEOUT); // Set RW timeout to 1ms

    Serial.println("Initialize radio...");
    if (radio.begin()) {
        radio_initialized = true;
        set_mode(mode_rx); // Init to RX by default
        Serial.println("Radio init OK");
    }

    // Throttle to pin A0
    throttle.attach(A0, 1000, 2000); // 1000 uSec = 1ms, 0 throttle. 2000 = max.
    throttle.write(0);
}

unsigned long lastTick = millis();
bool blink_tx = true;

void loop() {
    if (!radio_initialized) {
        unsigned long now = millis();
        if (now - lastTick > 500) {
            digitalWrite(LED_TX, blink_tx ? HIGH : LOW);
            digitalWrite(LED_RX, blink_tx ? LOW : HIGH);
            blink_tx = !blink_tx;
            lastTick = now;
        }
    }

    if (Serial.available() > 0) {
        // Get some bytes, max read = filling input buff
        size_t read_size = Serial
                .readBytesUntil(';', input_buff, INPUT_BUFF_SIZE);

        // A bit of cleaning up -- remove line terminators, null term input
        if (input_buff[read_size - 1] == '\n') {
            Serial.println("Unix style EOL");
            input_buff[read_size - 1] = '\0'; // Null-term instead of NL
            read_size -= 1;
        }
        if (input_buff[read_size - 1] == '\r') {
            Serial.println("Windows style EOL");
            input_buff[read_size] = '\0'; // Null-term instead of CR/NL
            read_size -= 1;
        }
        if (read_size < INPUT_BUFF_SIZE) {
            input_buff[read_size] = '\0'; // Make sure input is null terminated if can be
        }
        // Echo
        Serial.write("Serial get: [");
        Serial.write(input_buff, read_size);
        Serial.println("]");

        process_input(input_buff, read_size);
    }
    if (!transmitter && radio.available()) {
        Serial.println("Guerilla radio!!");
        radio.read(rx_buff, PAYLOAD_SIZE);
        Serial.print("Radio get: [");
        Serial.print((char *) rx_buff);
        Serial.println("]\n");
        // if (USE_PRINTF) { printf("Radio get: [%s]\n", rx_buff); }
        char *tok = strtok((char *) rx_buff, " ");
        if (strimatch(tok, "A")) { // Axis
            tok = strtok(NULL, " ");
            if (strimatch(tok, "0")) { // 0 = throttle
                tok = strtok(NULL, " ");
                int intVal = atoi(tok);
                if (intVal == 0 && !strimatch(tok, "0")) {
                    // printf("Error parsing %s (invalid number)", tok);
                } else if (intVal >= 0 && intVal < 256) {
                    // TODO: Accept negative values ?
                    byte value = map(intVal, 0, 256, 0, 180);
                    throttle.write(value);
                    Serial.write("Throttle: ");
                    Serial.println(value);
                } else {
                    PRINTF("Value %d out of bounds (0-255)\n", intVal)
                }
            } else {
                PRINTF("Axis %s not implemented.\n", tok)
            } else {
                PRINTF("Unknown radio command: [%s]\n", tok)
            }
            memset(rx_buff, 0, PAYLOAD_SIZE);
        }
    }
