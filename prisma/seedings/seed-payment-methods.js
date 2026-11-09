require('dotenv').config();

const prisma = require('../../src/shared/database/prisma');

const PAYMENT_METHODS = [
    {
        paymentMethodName: 'KBZ Pay (Demo)',
        accountName: 'NYX Tournament Demo',
        accountNumber: 'DEMO-KBZPAY-001',
    },
    {
        paymentMethodName: 'WavePay (Demo)',
        accountName: 'NYX Tournament Demo',
        accountNumber: 'DEMO-WAVEPAY-001',
    },
    {
        paymentMethodName: 'K Pay (Demo)',
        accountName: 'NYX Tournament Demo',
        accountNumber: 'DEMO-KPAY-001',
    },
];

async function seedPaymentMethods(database) {
    const methods = [];

    for (const paymentMethod of PAYMENT_METHODS) {
        const existing = await database.paymentMethod.findFirst({
            where: {
                paymentMethodName: paymentMethod.paymentMethodName,
                accountName: paymentMethod.accountName,
                accountNumber: paymentMethod.accountNumber,
            },
        });

        const method = existing || await database.paymentMethod.create({
            data: {
                ...paymentMethod,
                isActive: false,
            },
        });
        methods.push(method);
    }

    return methods;
}

if (require.main === module) {
    seedPaymentMethods(prisma)
        .then((methods) => {
            console.log('Demo payment methods seeded (inactive):', methods.map(({ id, paymentMethodName }) => ({
                id,
                paymentMethodName,
            })));
            console.log('Replace demo account details with real values and activate them before accepting payments.');
        })
        .catch((error) => {
            console.error('Failed to seed payment methods:', error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

module.exports = seedPaymentMethods;
