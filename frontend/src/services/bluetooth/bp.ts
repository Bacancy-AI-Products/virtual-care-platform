/**
 * Web Bluetooth wrapper for the standard Blood Pressure service (0x1810).
 *
 * Every standards-compliant medical BP cuff (Omron, A&D, Beurer, Welch Allyn,
 * etc.) implements this profile identically:we don't need vendor-specific
 * code. The flow:
 *
 *   1. Browser shows the OS pairing dialog (`navigator.bluetooth.requestDevice`).
 *   2. We connect to the GATT server, fetch the Blood Pressure Measurement
 *      characteristic (0x2A35) and subscribe to notifications.
 *   3. Every time the cuff finishes a measurement, the characteristic fires a
 *      notification carrying systolic / diastolic / mean arterial pressure
 *      (and optionally pulse + timestamp).
 *   4. The connection wrapper hands the parsed reading to subscribed callbacks.
 *
 * Spec references:
 *   - Bluetooth Blood Pressure Service 1.1
 *     https://www.bluetooth.com/specifications/specs/blood-pressure-service-1-1/
 *   - Blood Pressure Measurement characteristic (0x2A35):encoding below.
 *   - IEEE 11073-20601 SFLOAT (16-bit):used for the three pressure values.
 *
 * Note: Web Bluetooth requires HTTPS in production. `http://localhost` is
 * exempt, so dev works fine. Safari (iOS + macOS) refuses to ship Web
 * Bluetooth:`isBluetoothSupported()` returns false there and callers should
 * fall back to manual entry.
 */

// Standard 16-bit Bluetooth assigned numbers for the BP service.
const BP_SERVICE = 'blood_pressure'; // 0x1810
const BP_MEASUREMENT_CHAR = 'blood_pressure_measurement'; // 0x2A35

export interface BPReading {
    /** Systolic pressure in the cuff's reported unit. */
    systolic: number;
    /** Diastolic pressure in the cuff's reported unit. */
    diastolic: number;
    /** Mean Arterial Pressure (parsed but not stored:informational). */
    meanArterial: number;
    /** Unit reported by the cuff. Always mmHg in practice. */
    unit: 'mmHg' | 'kPa';
    /** Pulse rate at the time of measurement, if the cuff reports it. */
    pulse: number | null;
    /** Cuff-supplied timestamp, if reported. Falls back to current time. */
    timestamp: Date | null;
}

export interface BPCuffConnection {
    /** Human-friendly device name surfaced in the OS pairing dialog. */
    deviceName: string;
    /**
     * Subscribe to readings. Returns an `unsubscribe` function; calling it
     * does NOT disconnect the cuff (use `disconnect()` for that).
     */
    onReading: (cb: (r: BPReading) => void) => () => void;
    /** Close the GATT connection cleanly. Safe to call multiple times. */
    disconnect: () => void;
    /** True while the GATT server is still connected. */
    isConnected: () => boolean;
}

/**
 * Returns whether the current browser exposes the Web Bluetooth API at all.
 * On iOS Safari this is always `false`; callers should hide the "connect"
 * affordance and let the user fall back to manual entry.
 */
export function isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Opens the pairing dialog, connects to a BP cuff, and returns a connection
 * object. Throws if the user cancels the picker or no compatible cuff is
 * within range.
 */
export async function connectBPCuff(): Promise<BPCuffConnection> {
    if (!isBluetoothSupported()) {
        throw new Error('Web Bluetooth is not supported in this browser.');
    }

    // Asking for the BP service guarantees the OS only shows medical cuffs in
    // the picker:phones / headphones / other peripherals get filtered out.
    const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BP_SERVICE] }],
        optionalServices: [BP_SERVICE],
    });

    if (!device.gatt) {
        throw new Error('Selected device does not expose GATT.');
    }
    const gattServer: BluetoothRemoteGATTServer = device.gatt;
    const server = await gattServer.connect();
    const service = await server.getPrimaryService(BP_SERVICE);
    const char = await service.getCharacteristic(BP_MEASUREMENT_CHAR);

    const listeners = new Set<(r: BPReading) => void>();

    function handleNotification(event: Event) {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (!target.value) return;
        try {
            const reading = parseBPMeasurement(target.value);
            listeners.forEach((cb) => cb(reading));
        } catch (err) {
            console.error('Could not parse BP measurement frame:', err);
        }
    }

    char.addEventListener('characteristicvaluechanged', handleNotification);
    await char.startNotifications();

    let connected = true;
    function disconnect() {
        if (!connected) return;
        connected = false;
        try {
            char.removeEventListener('characteristicvaluechanged', handleNotification);
            char.stopNotifications().catch(() => {});
        } catch {
            // swallow:disconnect is best-effort
        }
        try {
            gattServer.disconnect();
        } catch {
            // swallow
        }
    }

    device.addEventListener('gattserverdisconnected', () => {
        connected = false;
    });

    return {
        deviceName: device.name ?? 'BP cuff',
        onReading(cb) {
            listeners.add(cb);
            return () => {
                listeners.delete(cb);
            };
        },
        disconnect,
        isConnected: () => connected,
    };
}

// ─── BP Measurement characteristic decoder ────────────────────────────────────

/**
 * Decode the Blood Pressure Measurement characteristic value per the BT spec.
 *
 * Frame layout (variable length, little-endian):
 *   byte 0       Flags (bitmask)
 *   bytes 1..2   Systolic  (SFLOAT)
 *   bytes 3..4   Diastolic (SFLOAT)
 *   bytes 5..6   Mean Arterial Pressure (SFLOAT)
 *   bytes 7..13  Timestamp (year, month, day, h, m, s):if flag bit 1 set
 *   bytes ?..+2  Pulse rate (SFLOAT)                  :if flag bit 2 set
 *   byte ?       User ID                               :if flag bit 3 set
 *   bytes ?..?+2 Measurement Status (uint16)           :if flag bit 4 set
 *
 * Flag bits:
 *   bit 0:unit:   0 = mmHg, 1 = kPa
 *   bit 1:timestamp present
 *   bit 2:pulse rate present
 *   bit 3:user id present
 *   bit 4:measurement status present
 */
export function parseBPMeasurement(value: DataView): BPReading {
    const flags = value.getUint8(0);
    const unit: 'mmHg' | 'kPa' = flags & 0x01 ? 'kPa' : 'mmHg';
    const hasTimestamp = !!(flags & 0x02);
    const hasPulse = !!(flags & 0x04);

    const systolic = readSfloat(value, 1);
    const diastolic = readSfloat(value, 3);
    const meanArterial = readSfloat(value, 5);

    let offset = 7;
    let timestamp: Date | null = null;
    if (hasTimestamp) {
        const year = value.getUint16(offset, true);
        const month = value.getUint8(offset + 2);
        const day = value.getUint8(offset + 3);
        const hour = value.getUint8(offset + 4);
        const minute = value.getUint8(offset + 5);
        const second = value.getUint8(offset + 6);
        timestamp = new Date(year, month - 1, day, hour, minute, second);
        offset += 7;
    }

    let pulse: number | null = null;
    if (hasPulse) {
        pulse = readSfloat(value, offset);
        offset += 2;
    }

    return { systolic, diastolic, meanArterial, unit, pulse, timestamp };
}

/**
 * Decode an IEEE 11073-20601 16-bit SFLOAT from `view` at `offset` (LE).
 *
 *   raw = uint16 little-endian
 *   exponent = signed 4-bit  (top nibble)
 *   mantissa = signed 12-bit (bottom 12 bits)
 *   value = mantissa * 10^exponent
 *
 * The spec also defines NaN / +Inf / -Inf reserved values; we treat the
 * "NaN" pattern as 0 because that's what mis-flagged frames look like and
 * propagating NaN into the UI is worse than logging the bad frame.
 */
function readSfloat(view: DataView, offset: number): number {
    const raw = view.getUint16(offset, true);
    const reservedNaN = 0x07ff;
    let exponent = (raw & 0xf000) >> 12;
    let mantissa = raw & 0x0fff;
    if (mantissa === reservedNaN) return 0;
    if (mantissa & 0x0800) mantissa -= 0x1000; // sign-extend 12-bit
    if (exponent & 0x0008) exponent -= 0x0010; // sign-extend 4-bit
    return Math.round(mantissa * Math.pow(10, exponent) * 100) / 100;
}
