import test from 'node:test';
import assert from 'node:assert';
import { getRoomOptions } from './hotel-availability.ts';

test('getRoomOptions', async (t) => {
  await t.test('should include the selected room even if it is unavailable', () => {
    const rooms = [
      { id: '1', number: '101', status: 'available' },
      { id: '2', number: '102', status: 'available' },
    ];
    const reservations = [
      { room_id: '2', check_in: '2026-08-01', check_out: '2026-08-10', status: 'confirmed' },
    ];
    const arrival = '2026-08-05';
    const departure = '2026-08-08';
    
    // Room 2 is unavailable
    const options = getRoomOptions(rooms, reservations, arrival, departure, null, '2');
    
    assert.strictEqual(options.length, 2);
    assert.ok(options.find(r => r.id === '2'));
    assert.ok(options.find(r => r.id === '1'));
  });
  
  await t.test('should return only available rooms if selected room is available', () => {
    const rooms = [
      { id: '1', number: '101', status: 'available' },
      { id: '2', number: '102', status: 'available' },
    ];
    const reservations: any[] = [];
    const arrival = '2026-08-05';
    const departure = '2026-08-08';
    
    const options = getRoomOptions(rooms, reservations, arrival, departure, null, '1');
    
    assert.strictEqual(options.length, 2);
  });
});
