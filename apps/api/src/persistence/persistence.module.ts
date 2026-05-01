import { Global, Module } from "@nestjs/common";
import { DATABASE_REPOSITORY } from "./database.repository.js";
import { SupabaseDatabase } from "./supabase.database.js";

@Global()
@Module({
  providers: [SupabaseDatabase, { provide: DATABASE_REPOSITORY, useExisting: SupabaseDatabase }],
  exports: [DATABASE_REPOSITORY]
})
export class PersistenceModule {}
