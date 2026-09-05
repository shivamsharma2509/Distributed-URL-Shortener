package com.shortstack.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class Base62Test {
    @Test
    void encodesIdsWithStableBase62Alphabet() {
        assertEquals("0", Base62.encode(0));
        assertEquals("Z", Base62.encode(61));
        assertEquals("10", Base62.encode(62));
        assertEquals("g8", Base62.encode(1000));
    }
}