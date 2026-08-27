import {
  assertSlotAvailable,
  findOverlapInList,
  rangesOverlap,
  SLOT_CONFLICT_MESSAGE,
  SlotConflictError,
} from './src/services/bookingConflicts.js';

const existing = { start: '2026-08-20T18:00:00.000Z', end: '2026-08-20T22:00:00.000Z' };

const cases = [
  {
    name: 'reserva válida (otro día)',
    start: '2026-08-21T18:00:00.000Z',
    end: '2026-08-21T22:00:00.000Z',
    expectConflict: false,
  },
  {
    name: 'reserva duplicada (mismo horario)',
    start: existing.start,
    end: existing.end,
    expectConflict: true,
  },
  {
    name: 'reserva parcialmente solapada (comienza durante otra)',
    start: '2026-08-20T20:00:00.000Z',
    end: '2026-08-21T00:00:00.000Z',
    expectConflict: true,
  },
  {
    name: 'reserva parcialmente solapada (termina durante otra)',
    start: '2026-08-20T16:00:00.000Z',
    end: '2026-08-20T19:00:00.000Z',
    expectConflict: true,
  },
  {
    name: 'reserva contenida',
    start: '2026-08-20T19:00:00.000Z',
    end: '2026-08-20T21:00:00.000Z',
    expectConflict: true,
  },
  {
    name: 'reserva que contiene a otra',
    start: '2026-08-20T16:00:00.000Z',
    end: '2026-08-20T23:00:00.000Z',
    expectConflict: true,
  },
  {
    name: 'reserva consecutiva permitida (empieza al terminar la otra)',
    start: existing.end,
    end: '2026-08-21T02:00:00.000Z',
    expectConflict: false,
  },
  {
    name: 'reserva consecutiva permitida (termina al empezar la otra)',
    start: '2026-08-20T14:00:00.000Z',
    end: existing.start,
    expectConflict: false,
  },
  {
    name: 'cancelada no bloquea',
    start: existing.start,
    end: existing.end,
    existingStatus: 'cancelado',
    expectConflict: false,
  },
];

let failed = 0;

console.log('=== Solapamiento de intervalos ===');
for (const test of cases.filter((item) => !item.existingStatus)) {
  const overlap = rangesOverlap(test.start, test.end, existing.start, existing.end);
  const pass = overlap === test.expectConflict;
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${test.name} | overlap=${overlap}`);
}

console.log('\n=== Consulta Mongo (start_time < fin AND end_time > inicio) ===');
for (const test of cases) {
  const bookings = [
    {
      id: 1,
      room_id: 1,
      start_time: existing.start,
      end_time: existing.end,
      status: test.existingStatus ?? 'reservado',
    },
  ];
  const found = findOverlapInList(bookings, {
    roomId: 1,
    startTime: test.start,
    endTime: test.end,
  });
  const hasConflict = Boolean(found);
  const pass = hasConflict === test.expectConflict;
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${test.name} | conflict=${hasConflict}`);
}

console.log('\n=== Check + insert (segunda reserva en el mismo slot) ===');
{
  const bookings = [];
  const slot = { roomId: 1, startTime: existing.start, endTime: existing.end };

  const first = findOverlapInList(bookings, slot);
  if (first) throw new Error('La primera reserva no debería chocar');
  bookings.push({
    id: 1,
    room_id: 1,
    start_time: slot.startTime,
    end_time: slot.endTime,
    status: 'reservado',
  });

  let threw = false;
  try {
    const conflict = findOverlapInList(bookings, slot);
    if (conflict) throw new SlotConflictError();
  } catch (err) {
    threw = err instanceof SlotConflictError && err.message === SLOT_CONFLICT_MESSAGE;
  }

  const pass = threw;
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'} | segunda reserva simultánea en el mismo slot → 409`);
}

console.log('\n=== Local distinto permitido ===');
{
  const bookings = [
    {
      id: 1,
      room_id: 1,
      start_time: existing.start,
      end_time: existing.end,
      status: 'reservado',
    },
  ];
  const found = findOverlapInList(bookings, {
    roomId: 2,
    startTime: existing.start,
    endTime: existing.end,
  });
  const pass = !found;
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'} | mismo horario en otro local`);
}

void assertSlotAvailable;

if (failed) {
  console.error(`\n${failed} prueba(s) fallaron.`);
  process.exit(1);
}

console.log('\nTodas las pruebas de doble reserva pasaron.');
process.exit(0);
