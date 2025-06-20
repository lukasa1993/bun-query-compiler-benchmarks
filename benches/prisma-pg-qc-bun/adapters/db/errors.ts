import type { Error as DriverAdapterErrorObject } from "@prisma/driver-adapter-utils";

export interface PgError {
	code?: string;
	message: string;
	severity: string;
	detail?: string;
	column?: string;
	hint?: string;
	constraint?: string;
}

export function convertDriverError(error: unknown): DriverAdapterErrorObject {
	if (!isDbError(error)) {
		throw error;
	}

	const err = error as PgError;

	switch (err.code) {
		case "22001":
			return {
				kind: "LengthMismatch",
				column: err.column,
			};
		case "23505": {
			const fields = err.detail
				?.match(/Key \(([^)]+)\)/)
				?.at(1)
				?.split(", ");
			return {
				kind: "UniqueConstraintViolation",
				fields: fields ?? [],
			};
		}
		case "23502": {
			const fields = err.detail
				?.match(/Key \(([^)]+)\)/)
				?.at(1)
				?.split(", ");
			return {
				kind: "NullConstraintViolation",
				fields: fields ?? [],
			};
		}
		case "23503": {
			let constraint: { fields: string[] } | { index: string } | undefined;

			if (err.column) {
				constraint = { fields: [err.column] };
			} else if (err.constraint) {
				constraint = { index: err.constraint };
			}

			return {
				kind: "ForeignKeyConstraintViolation",
				constraint,
			};
		}
		case "3D000":
			return {
				kind: "DatabaseDoesNotExist",
				db: err.message.split(" ").at(1)?.split('"').at(1),
			};
		case "28000":
			return {
				kind: "DatabaseAccessDenied",
				db: err.message.split(" ").at(5)?.split('"').at(1),
			};
		case "28P01":
			return {
				kind: "AuthenticationFailed",
				user: err.message.split(" ").pop()?.split('"').at(1),
			};
		case "40001":
			return {
				kind: "TransactionWriteConflict",
			};
		case "42P01":
			return {
				kind: "TableDoesNotExist",
				table: err.message.split(" ").at(1)?.split('"').at(1),
			};
		case "42703":
			return {
				kind: "ColumnNotFound",
				column: err.message.split(" ").at(1)?.split('"').at(1),
			};
		case "42P04":
			return {
				kind: "DatabaseAlreadyExists",
				db: err.message.split(" ").at(1)?.split('"').at(1),
			};
		case "53300":
			return {
				kind: "TooManyConnections",
				cause: err.message,
			};
		default:
			return {
				kind: "postgres",
				code: err.code ?? "N/A",
				severity: err.severity ?? "N/A",
				message: err.message,
				detail: err.detail,
				column: err.column,
				hint: err.hint,
			};
	}
}

function isDbError(error: unknown): error is PgError {
	const e = error as Partial<PgError>;
	return (
		typeof e.code === "string" &&
		typeof e.message === "string" &&
		typeof e.severity === "string" &&
		(typeof e.detail === "string" || e.detail === undefined) &&
		(typeof e.column === "string" || e.column === undefined) &&
		(typeof e.hint === "string" || e.hint === undefined)
	);
}
