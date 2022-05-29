#ifndef _RC_FIRST_H
# define _RC_FIRST_H

// Basic Arduino (micro) stuff
# define LED_TX 30
# define LED_RX 17

// Serial console related stuff
# define SERIAL_BAUDRATE 115200
// Timeout in milliseconds
# define SERIAL_TIMEOUT 1
# define INPUT_BUFF_SIZE 64

// nRF2401 stuff
# define PIN_CE 2
# define PIN_CSN 3
# define PAYLOAD_SIZE 32

enum e_mode {
    mode_tx,
    mode_rx,
    none
};

#endif
