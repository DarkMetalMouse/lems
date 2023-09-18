import { Filter, ObjectId } from "mongodb";
import { Event } from "@lems/types";
import db from '../database';

export const getEvent = (filter: Filter<Event>) => {
  return db.collection<Event>('events').findOne(filter);
};

export const getAllEvents = () => {
  return db.collection<Event>('events').find({}).toArray();
};

export const updateEvent = (filter: Filter<Event>, newEvent: Partial<Event>) => {
  return db.collection<Event>('events').updateOne(filter, { $set: newEvent }, { upsert: true });
};

export const getTableEvents = (tableId: ObjectId) => {
  return db.collection<Event>('events').find({ table: tableId }).toArray();
};

export const addEvent = (event: Event) => {
  return db
    .collection<Event>('events')
    .insertOne(event)
    .then(response => response);
};

export const addEvents = (events: Event[]) => {
  return db
    .collection<Event>('events')
    .insertMany(events)
    .then(response => response);
};

export const deleteEvent = (filter: Filter<Event>) => {
  return db
    .collection<Event>('events')
    .deleteOne(filter)
    .then(response => response);
};

export const deleteTableEvents = (tableId: ObjectId) => {
  return db
    .collection<Event>('events')
    .deleteMany({ table: tableId })
    .then(response => response);
};
