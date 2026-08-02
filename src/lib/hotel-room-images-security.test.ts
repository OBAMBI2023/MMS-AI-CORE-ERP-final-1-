import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260802190000_persist_hotel_room_cover_images.sql",
    import.meta.url,
  ),
  "utf8",
);
const crud = readFileSync(
  new URL("../components/hotel/HotelRoomsCrud.tsx", import.meta.url),
  "utf8",
);

test("hotel room images remain private and size/type constrained", () => {
  assert.match(migration, /'hotel-room-images',[\s\S]*false,[\s\S]*5242880/);
  assert.match(migration, /ARRAY\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
  assert.doesNotMatch(migration, /public\s*=\s*true/);
});

test("hotel room image policies isolate tenant, room and permissions", () => {
  for (const operation of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
    assert.match(migration, new RegExp(`FOR ${operation} TO authenticated`));
  }
  assert.match(
    migration,
    /\(storage\.foldername\(name\)\)\[1\] = public\.hotel_tenant_id\(\)::text/,
  );
  assert.match(migration, /room\.id::text = \(storage\.foldername\(name\)\)\[2\]/);
  assert.match(migration, /room\.tenant_id = public\.hotel_tenant_id\(\)/);
  for (const permission of ["view", "create", "update", "delete"]) {
    assert.match(migration, new RegExp(`hotel\\.rooms\\.${permission}`));
  }
});

test("room CRUD signs private paths and no longer stores image data locally", () => {
  assert.match(crud, /createSignedUrls\(/);
  assert.match(crud, /cover_image_path/);
  assert.match(crud, /\.upload\(path, file/);
  assert.doesNotMatch(crud, /localStorage\.setItem/);
});
