#include "rcfirst.h"

// RF comm stuff
#include <SPI.h>
#include <nRF24L01.h>
#include <RF24.h>
#include <printf.h>

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
const char *modeNames[] = { "Transmitter", "Receiver" };
void set_mode(e_mode mode_target) {
    static e_mode mode_current = none;

    if (mode_target == mode_current) {
        Serial.println("Already in requested mode.");
        return;
    }
    printf("Switch to %s mode...\n", modeNames[mode_target]);

    switch (mode_target)
    {
    case mode_tx:
        radio.stopListening();
        radio.closeReadingPipe(0);// Is this close necessary ?
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
    // Echo
    Serial.print("Serial get: "); Serial.println(input);

    // Check for RX / TX instruction
    if (strimatch(input, "T")
    || strimatch(input, "tx")
    || strimatch(input, "transmit")
    || strimatch(input, "send")) {
        set_mode(mode_tx);
        return ;
    }
    else if (strimatch(input, "R") || strimatch(input, "rx") || strimatch(input, "receive") || strimatch(input, "recv")) {
        set_mode(mode_rx);
        return ;
    }
    if (strimatch(input, "radio")
    || strimatch(input, "status")) {
        radio.printPrettyDetails();
        printf("Initialized: %s\n", radio_initialized ? "true" : "false");
        return ;
    }
    if (transmitter
    && (!memcmp(input, "M ", sizeof(char) * 2)
    || !memcmp(input, "m ", sizeof(char) * 2))) {
        if (strlen(input) > 2) {
            printf("Sending payload: [%s] (%d bytes)\n", input + 2, strlen(input + 2));
            radio.write(input + 2, sizeof(char) * strlen(input + 2));
        }
        return ;
    }

    Serial.println("Unrecognized input.");
}

void setup()
{
    printf_begin();
    pinMode(LED_BUILTIN, OUTPUT);
    pinMode(LED_TX, OUTPUT);
    pinMode(LED_RX, OUTPUT);

    Serial.begin(SERIAL_BAUDRATE);
    Serial.setTimeout(1); // Set RW timeout to 1ms

    Serial.println("Initialize radio...");
    if (radio.begin()) { // Great Success
        radio_initialized = true;
        set_mode(mode_rx); // Init to RX by default
        Serial.println("Radio init OK");
    }
}

size_t read_size = 0;
unsigned long lastTick = millis();
bool blink_tx = true;
void loop()
{
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
        read_size = Serial.readBytesUntil('\n', input_buff, INPUT_BUFF_SIZE);
        size_t string_size = read_size;

        // A bit of cleaning up -- remove line terminators, null term input
        if (input_buff[read_size - 2] == '\r') {
            input_buff[read_size - 2] = 0; // Null-term instead of CR/NL
            string_size -= 2;
        } else if (input_buff[read_size - 1] == '\n') {
            input_buff[read_size - 1] = 0; // Null-term instead of NL
            string_size -= 1;
        } else if (read_size < INPUT_BUFF_SIZE) {
            input_buff[read_size] = '\0'; // Make sure input is null terminated if can be
        }

        process_input(input_buff, string_size);
    }
    if (!transmitter && radio.available()) {
        radio.read(rx_buff, PAYLOAD_SIZE);
        Serial.println((char *)rx_buff);
        memset(rx_buff, 0, PAYLOAD_SIZE);
    }
}
