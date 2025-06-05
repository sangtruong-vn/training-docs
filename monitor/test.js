
const https = require('https');
const http = require('http');
const url = require('url');

// Slack webhook URL - configured and ready to use
const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/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';

const websites = [
    'https://google.com',
    'https://github.com',
];

async function sendSlackNotification(result, isRecovery = false) {
    if (!SLACK_WEBHOOK_URL || SLACK_WEBHOOK_URL === 'YOUR_SLACK_WEBHOOK_URL_HERE') {
        return; // Skip if no webhook configured
    }
    
    const emoji = isRecovery ? '✅' : '❌';
    const color = isRecovery ? 'good' : 'danger';
    const status = isRecovery ? 'RECOVERED' : result.status;
    
    const message = {
        attachments: [{
            color: color,
            title: `🌐 Website Monitor Alert`,
            fields: [
                {
                    title: "Website",
                    value: result.url,
                    short: true
                },
                {
                    title: "Status",
                    value: `${emoji} ${status}`,
                    short: true
                },
                {
                    title: "Response Time",
                    value: `${result.responseTime}ms`,
                    short: true
                },
                {
                    title: "Status Code",
                    value: result.statusCode || 'N/A',
                    short: true
                }
            ],
            footer: "Website Monitor",
            ts: Math.floor(Date.now() / 1000)
        }]
    };
    
    try {
        const webhookUrl = new URL(SLACK_WEBHOOK_URL);
        const postData = JSON.stringify(message);
        
        const options = {
            hostname: webhookUrl.hostname,
            port: webhookUrl.port || 443,
            path: webhookUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options);
        req.write(postData);
        req.end();
        
        console.log(`📱 Slack notification sent for ${result.url}`);
    } catch (error) {
        console.error('Failed to send Slack notification:', error.message);
    }
}

function checkWebsite(siteUrl) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const parsedUrl = url.parse(siteUrl);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        const req = client.get(siteUrl, (res) => {
            const responseTime = Date.now() - startTime;
            resolve({
                url: siteUrl,
                status: 'UP',
                statusCode: res.statusCode,
                responseTime: responseTime,
                timestamp: new Date().toISOString()
            });
            // Initialize
            // loadWebsites();
            // setAutoRefresh();
        });
        
        
        req.on('error', (error) => {
            resolve({
                url: siteUrl,
                status: 'DOWN',
                error: error.message,
                responseTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            });
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            resolve({
                url: siteUrl,
                status: 'TIMEOUT',
                responseTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            });
        });
    });
}

// Store previous status to detect changes
const previousStatus = {};

async function monitorWebsites() {
    console.log('🌐 Website Monitoring Started...\n');
    
    for (const website of websites) {
        const result = await checkWebsite(website);
        
        const status = result.status === 'UP' ? '✅' : '❌';
        console.log(`${status} ${result.url}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Response Time: ${result.responseTime}ms`);
        console.log(`   Time: ${result.timestamp}\n`);
        
        // Check for status changes and send Slack notifications
        const prevStatus = previousStatus[website];
        
        if (prevStatus && prevStatus !== result.status) {
            if (result.status !== 'UP') {
                // Website went down
                await sendSlackNotification(result, false);
            } else if (prevStatus !== 'UP' && result.status === 'UP') {
                // Website recovered
                await sendSlackNotification(result, true);
            } else {
                console.log(`   Send notification!`);
                // Website recovered
                await sendSlackNotification(result, true);
            }
        } else if (!prevStatus && result.status !== 'UP') {
            // First check and site is down
            await sendSlackNotification(result, false);
        } else {
            console.log(`   Send notification OK!`);
            // Website recovered
            await sendSlackNotification(result, true);
        }
        
        previousStatus[website] = result.status;
    }
}

// Test Slack notification function
async function testSlackNotification() {
    const testResult = {
        url: 'https://example.com',
        status: 'UP',
        statusCode: 200,
        responseTime: 123,
        timestamp: new Date().toISOString()
    };
    
    console.log('🧪 Sending test Slack notification...');
    await sendSlackNotification(testResult, false);
}

// Uncomment to test Slack notification
// testSlackNotification();

// Run once
monitorWebsites();

// Run every 5 minutes
setInterval(monitorWebsites, 5 * 60 * 1000);
            