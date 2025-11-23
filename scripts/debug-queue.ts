import 'dotenv/config';
import { Queue } from 'bullmq';
import { getRedisConnection } from '../packages/queue/src/connection';

async function debugQueue() {
    console.log('🔍 Inspecting "notifications" queue...');
    
    const redis = getRedisConnection();
    const queue = new Queue('notifications', { connection: redis });

    const counts = await queue.getJobCounts();
    console.log('📊 Job Counts:', counts);

    const failed = await queue.getFailed();
    if (failed.length > 0) {
        console.log(`\n❌ Found ${failed.length} failed jobs:`);
        for (const job of failed.slice(0, 5)) {
            console.log(`   - ID: ${job.id}`);
            console.log(`     Type: ${job.data.type}`);
            console.log(`     Channel: ${job.data.channel}`);
            console.log(`     Reason: ${job.failedReason}`);
            console.log(`     Stack: ${job.stacktrace[0]}`);
            console.log('---');
        }
    } else {
        console.log('\n✅ No failed jobs found.');
    }

    const waiting = await queue.getWaiting();
    if (waiting.length > 0) {
        console.log(`\n⏳ Found ${waiting.length} waiting jobs:`);
        for (const job of waiting.slice(0, 5)) {
            console.log(`   - ID: ${job.id} (${job.name})`);
        }
    }

    const completed = await queue.getCompleted();
    if (completed.length > 0) {
        console.log(`\n✅ Found ${completed.length} completed jobs (showing last 5):`);
        // Sort by timestamp descending
        const sorted = completed.sort((a: any, b: any) => b.timestamp - a.timestamp);
        
        for (const job of sorted.slice(0, 5)) {
            console.log(`   - ID: ${job.id}`);
            console.log(`     Type: ${job.data.type}`);
            console.log(`     Channel: ${job.data.channel}`);
            console.log(`     Recipient: ${job.data.recipient}`);
            console.log(`     Result:`, JSON.stringify(job.returnvalue, null, 2));
            console.log(`     Time: ${new Date(job.timestamp).toISOString()}`);
            console.log('---');
        }
    }

    await queue.close();
    process.exit(0);
}

debugQueue().catch(console.error);
