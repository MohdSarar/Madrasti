import test from "node:test";
import assert from "node:assert/strict";
import { EventBus } from "../dist/index.js";

test("EventBus.publish serializes payload and writes to xAdd", async () => {
  const calls = [];
  const fake = {
    isOpen: true,
    connect: async () => {},
    quit: async () => {},
    xAdd: async (...args) => { calls.push(args); },
    xGroupCreate: async () => {},
    xReadGroup: async () => null,
    xAck: async () => {},
  };

  const bus = new EventBus({ pub: fake, sub: fake });

  await bus.publish("madrasti.events", {
    type: "school.provisioned",
    payload: { school_id: "s1" },
    timestamp: 1700000000000,
    correlation_id: "c1",
  });

  assert.equal(calls.length, 1);
  const [stream, id, fields] = calls[0];
  assert.equal(stream, "madrasti.events");
  assert.equal(id, "*");
  assert.equal(fields.type, "school.provisioned");
  assert.equal(fields.payload, JSON.stringify({ school_id: "s1" }));
  assert.equal(fields.timestamp, "1700000000000");
  assert.equal(fields.correlation_id, "c1");
});

test("EventBus.consume passes parsed event to handler and acks", async () => {
  const ackCalls = [];
  const fakeSub = {
    isOpen: true,
    connect: async () => {},
    quit: async () => {},
    xGroupCreate: async () => {},
    xReadGroup: async () => [
      {
        name: "madrasti.events",
        messages: [
          {
            id: "1-0",
            message: {
              type: "student.created",
              payload: JSON.stringify({ id: "st1" }),
              timestamp: "1700000000001",
              correlation_id: "c2",
            },
          },
        ],
      },
    ],
    xAck: async (...args) => { ackCalls.push(args); },
  };

  const fakePub = { isOpen: true, connect: async () => {}, quit: async () => {}, xAdd: async () => {} };

  const bus = new EventBus({ pub: fakePub, sub: fakeSub });

  let handled = null;
  await bus.consume({
    stream: "madrasti.events",
    group: "g1",
    consumer: "c1",
    blockMs: 1,
    handler: async (event, ack) => {
      handled = event;
      await ack();
    },
  });

  assert.deepEqual(handled, {
    type: "student.created",
    payload: { id: "st1" },
    timestamp: 1700000000001,
    correlation_id: "c2",
  });
  assert.equal(ackCalls.length, 1);
  assert.deepEqual(ackCalls[0], ["madrasti.events", "g1", "1-0"]);
});
