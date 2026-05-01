import { Global, Module } from "@nestjs/common";
import { InMemoryDatabase } from "./in-memory.database.js";

@Global()
@Module({
  providers: [InMemoryDatabase],
  exports: [InMemoryDatabase]
})
export class PersistenceModule {}
