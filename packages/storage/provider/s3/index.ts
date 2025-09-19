import {
	GetObjectCommand,
	PutObjectCommand,
	DeleteObjectCommand,
	HeadObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@repo/logs";
import type {
	GetSignedUploadUrlHandler,
	GetSignedUrlHander,
	DeleteObjectHandler,
	GetObjectMetadataHandler,
} from "../../types";

let s3Client: S3Client | null = null;

const getS3Client = () => {
	if (s3Client) {
		return s3Client;
	}

	const s3Endpoint = process.env.S3_ENDPOINT as string;
	if (!s3Endpoint) {
		throw new Error("Missing env variable S3_ENDPOINT");
	}

	const s3Region = (process.env.S3_REGION as string) || "auto";

	const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID as string;
	if (!s3AccessKeyId) {
		throw new Error("Missing env variable S3_ACCESS_KEY_ID");
	}

	const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY as string;
	if (!s3SecretAccessKey) {
		throw new Error("Missing env variable S3_SECRET_ACCESS_KEY");
	}

	s3Client = new S3Client({
		region: s3Region,
		endpoint: s3Endpoint,
		forcePathStyle: true,
		credentials: {
			accessKeyId: s3AccessKeyId,
			secretAccessKey: s3SecretAccessKey,
		},
	});

	return s3Client;
};

export const deleteObject: DeleteObjectHandler = async (path, { bucket }) => {
	const s3Client = getS3Client();
	try {
		await s3Client.send(
			new DeleteObjectCommand({ Bucket: bucket, Key: path }),
		);
	} catch (e) {
		logger.error(e);
		throw new Error("Could not delete object");
	}
};

export const getSignedUploadUrl: GetSignedUploadUrlHandler = async (
	path,
	{ bucket, contentType },
) => {
	const s3Client = getS3Client();
	try {
		return await getS3SignedUrl(
			s3Client,
			new PutObjectCommand({
				Bucket: bucket,
				Key: path,
				...(contentType ? { ContentType: contentType } : {}),
			}),
			{
				expiresIn: 60,
			},
		);
	} catch (e) {
		logger.error(e);

		throw new Error("Could not get signed upload url");
	}
};

export const getSignedUrl: GetSignedUrlHander = async (
	path,
	{ bucket, expiresIn },
) => {
	const s3Client = getS3Client();
	try {
		return getS3SignedUrl(
			s3Client,
			new GetObjectCommand({ Bucket: bucket, Key: path }),
			{ expiresIn },
		);
	} catch (e) {
		logger.error(e);
		throw new Error("Could not get signed url");
	}
};

export const getObjectMetadata: GetObjectMetadataHandler = async (
	path,
	{ bucket },
) => {
	const s3Client = getS3Client();
	try {
		const res = await s3Client.send(
			new HeadObjectCommand({ Bucket: bucket, Key: path }),
		);
		return {
			exists: true,
			contentType: res.ContentType ?? null,
			size: typeof res.ContentLength === 'number' ? res.ContentLength : (res.ContentLength ? Number(res.ContentLength) : null),
			lastModified: res.LastModified ?? null,
		};
	} catch (e: any) {
		// Not found
		if (e?.$metadata?.httpStatusCode === 404 || e?.name === 'NotFound') {
			return { exists: false, contentType: null, size: null, lastModified: null };
		}
		logger.error(e);
		return { exists: false, contentType: null, size: null, lastModified: null };
	}
};
