
import { toInternalChannel } from './enhanced-notification.service';

const validChannels = ['EMAIL', 'SMS', 'WHATSAPP'];
const invalidChannels = ['PUSH', 'UNKNOWN', ''];

console.log('Running tests for toInternalChannel...');

let passed = 0;
let failed = 0;

// Test valid channels
validChannels.forEach(channel => {
    try {
        const result = toInternalChannel(channel as any);
        if (result !== channel.toLowerCase()) {
             console.error(`FAIL: ${channel} mapped to ${result}, expected ${channel.toLowerCase()}`);
             failed++;
        } else {
            console.log(`PASS: ${channel} -> ${result}`);
            passed++;
        }
    } catch (e: any) {
        console.error(`FAIL: ${channel} threw error: ${e.message}`);
        failed++;
    }
});

// Test invalid channels
invalidChannels.forEach(channel => {
    try {
        toInternalChannel(channel as any);
        console.error(`FAIL: ${channel} should have thrown error`);
        failed++;
    } catch (e: any) {
        console.log(`PASS: ${channel} threw error as expected: ${e.message}`);
        passed++;
    }
});

if (failed > 0) {
    console.error(`\nTests failed: ${failed}`);
    process.exit(1);
} else {
    console.log(`\nAll tests passed: ${passed}`);
    process.exit(0);
}
