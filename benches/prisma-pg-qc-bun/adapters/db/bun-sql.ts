import type {
	ColumnType,
	ConnectionInfo,
	IsolationLevel,
	SqlDriverAdapter,
	SqlMigrationAwareDriverAdapterFactory,
	SqlQuery,
	SqlQueryable,
	SqlResultSet,
	Transaction,
	TransactionOptions,
} from "@prisma/driver-adapter-utils";
import {
	ColumnTypeEnum,
	DriverAdapterError,
} from "@prisma/driver-adapter-utils";
import type { ReservedSQL } from "bun";
import { SQL } from "bun";
import { UnsupportedNativeDataType, fieldToColumnType } from "./conversion";
import { convertDriverError } from "./errors";

const packageName = "cfi-bun-prisma-adapter";
const debug = (..._args: unknown[]) => {
	// console.log("__bun_prisma__", ...args);
};

function guessColumnTypes(rows: Record<string, unknown>[]): ColumnType[] {
	if (!rows.length) return [];
	const names = Object.keys((rows as unknown as string[])[0] ?? {});
	const colTypes: ColumnType[] = [];
	for (const n of names) {
		let sample: unknown;
		for (const r of rows) {
			if (r[n] !== null && r[n] !== undefined) {
				sample = r[n];
				break;
			}
		}
		try {
			// @ts-expect-error we can't know the OID – delegate
			colTypes.push(fieldToColumnType(sample));
		} catch {
			colTypes.push(ColumnTypeEnum.Text);
		}
	}
	return colTypes;
}

type StdClient = SQL;
type TransactionClient = ReservedSQL;

class PgQueryable<ClientT extends StdClient | TransactionClient>
	implements SqlQueryable
{
	readonly provider = "postgres";
	readonly adapterName = packageName;

	constructor(protected readonly client: ClientT) {}

	async queryRaw(query: SqlQuery): Promise<SqlResultSet> {
		const tag = "[bun::query_raw]";
		debug(`${tag} %O`, query);

		const objectRows = (await this.performIO(query)) as Record<
			string,
			unknown
		>[];
		const columnNames = objectRows.length
			? Object.keys(objectRows[0] ?? {})
			: [];
		let columnTypes: ColumnType[] = [];
		try {
			columnTypes = guessColumnTypes(objectRows);
		} catch (e) {
			if (e instanceof UnsupportedNativeDataType) {
				throw new DriverAdapterError({
					kind: "UnsupportedNativeDataType",
					type: e.type,
				});
			}
			throw e;
		}

		const rows: unknown[][] = objectRows.map((obj) =>
			columnNames.map((name) => obj[name]),
		);
		return { columnNames, columnTypes, rows };
	}

	async executeRaw(query: SqlQuery): Promise<number> {
		const tag = "[bun::execute_raw]";
		debug(`${tag} %O`, query);
		// bun-sql   returns rows for DML and an empty array for DDL.
		const res = (await this.performIO(query)) as unknown[];
		return Array.isArray(res) ? res.length : 0;
	}

	private async performIO(query: SqlQuery): Promise<unknown> {
		try {
			// Bun's sql client supports positional parameters when using .unsafe
			return await this.client.unsafe(query.sql, query.args);
		} catch (e) {
			this.onError(e);
		}
	}

	protected onError(error: unknown): never {
		debug("Error in performIO: %O", error);
		throw new DriverAdapterError(convertDriverError(error));
	}
}

class PgTransaction
	extends PgQueryable<TransactionClient>
	implements Transaction
{
	constructor(
		client: TransactionClient,
		readonly options: TransactionOptions,
	) {
		super(client);
	}

	async commit(): Promise<void> {
		debug("[bun::commit]");
		await this.client.flush();
		this.client.release?.();
	}

	async rollback(): Promise<void> {
		debug("[bun::rollback]");
		await this.client.flush();
		this.client.release?.();
	}
}

export type PrismaPgOptions = { schema?: string };

export class PrismaBunAdapter
	extends PgQueryable<StdClient>
	implements SqlDriverAdapter
{
	constructor(
		client: StdClient,
		private options?: PrismaPgOptions,
		private readonly release?: () => Promise<void>,
	) {
		super(client);
	}

	async startTransaction(
		isolationLevel?: IsolationLevel,
	): Promise<Transaction> {
		const options: TransactionOptions = { usePhantomQuery: false };
		debug("[bun::startTransaction] options: %O", options);

		// reserve an exclusive connection
		const reserved = await this.client.reserve();
		if (isolationLevel) {
			await reserved.unsafe(
				`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`,
			);
		}
		await reserved`BEGIN`;
		return new PgTransaction(reserved, options);
	}

	async executeScript(script: string): Promise<void> {
		for (const stmt of script
			.split(";")
			.map((s) => s.trim())
			.filter(Boolean)) {
			try {
				await this.client.unsafe(stmt);
			} catch (error) {
				this.onError(error);
			}
		}
	}

	getConnectionInfo(): ConnectionInfo {
		return { schemaName: this.options?.schema, supportsRelationJoins: true };
	}

	async dispose(): Promise<void> {
		await this.release?.();
		await this.client.close();
	}
}

export class PrismaBunAdapterFactory
	implements SqlMigrationAwareDriverAdapterFactory
{
	readonly provider = "postgres";
	readonly adapterName = packageName;

	constructor(
		private readonly cfg: Record<string, unknown>,
		private readonly options?: PrismaPgOptions,
	) {}

	private createSQL(_overrides: Record<string, unknown> = {}): SQL {
		return new SQL(`${this.cfg.connectionString}`, {
			max: 3,
			idle_timeout: 20,
			max_lifetime: 60 * 30,
			connectionTimeout: 10,
		});
	}

	async connect(): Promise<SqlDriverAdapter> {
		return new PrismaBunAdapter(this.createSQL(), this.options, async () => {});
	}

	async connectToShadowDb(): Promise<SqlDriverAdapter> {
		const conn = await this.connect();
		const database = `prisma_migrate_shadow_db_${globalThis.crypto.randomUUID()}`;
		await conn.executeScript(`CREATE DATABASE "${database}"`);

		return new PrismaBunAdapter(
			this.createSQL({ database }),
			undefined,
			async () => {
				await conn.executeScript(`DROP DATABASE "${database}"`);
			},
		);
	}
}
