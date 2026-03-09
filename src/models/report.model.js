import mongoose from 'mongoose';

const filmSchema = new mongoose.Schema(
    {
        film: {
            type: String,
            required: [true, 'Film name is required'],
            trim: true,
        },
        shows: {
            type: Number,
            required: true,
            default: 0,
        },
        ticketsSold: {
            type: Number,
            required: true,
            default: 0,
        },
        grossAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        netAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        occupancyPercent: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { _id: false }
);

const screenSchema = new mongoose.Schema(
    {
        screen: {
            type: String,
            required: [true, 'Screen name is required'],
            trim: true,
        },
        shows: {
            type: Number,
            required: true,
            default: 0,
        },
        ticketsSold: {
            type: Number,
            required: true,
            default: 0,
        },
        grossAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        netAmount: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { _id: false }
);

const concessionSchema = new mongoose.Schema(
    {
        itemClass: {
            type: String,
            required: [true, 'Item class is required'],
            trim: true,
        },
        transCount: {
            type: Number,
            required: true,
            default: 0,
        },
        qtySold: {
            type: Number,
            required: true,
            default: 0,
        },
        saleValue: {
            type: Number,
            required: true,
            default: 0,
        },
        percentage: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { _id: false }
);

const totalsSchema = new mongoose.Schema(
    {
        shows: {
            type: Number,
            default: 0,
        },
        ticketsSold: {
            type: Number,
            default: 0,
        },
        grossAmount: {
            type: Number,
            default: 0,
        },
        netAmount: {
            type: Number,
            default: 0,
        },
        avgOccupancy: {
            type: Number,
            default: 0,
        },
        totalConcessionValue: {
            type: Number,
            default: 0,
        },
    },
    { _id: false }
);

const reportSchema = new mongoose.Schema(
    {
        date: {
            type: String,
            required: [true, 'Report date is required'],
            unique: true,
            match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
            index: true,
        },
        films: {
            type: [filmSchema],
            default: [],
        },
        screens: {
            type: [screenSchema],
            default: [],
        },
        concessions: {
            type: [concessionSchema],
            default: [],
        },
        totals: {
            type: totalsSchema,
            default: () => ({}),
        },
    },
    {
        timestamps: true, // adds createdAt and updatedAt
        toJSON: {
            transform(doc, ret) {
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Pre-save hook to calculate totals
reportSchema.pre('save', function (next) {
    if (this.films && this.films.length > 0) {
        let totalShows = 0;
        let totalTickets = 0;
        let totalGross = 0;
        let totalNet = 0;
        let occupancySum = 0;

        for (const f of this.films) {
            totalShows += f.shows || 0;
            totalTickets += f.ticketsSold || 0;
            totalGross += f.grossAmount || 0;
            totalNet += f.netAmount || 0;
            occupancySum += f.occupancyPercent || 0;
        }

        const avgOccupancy = occupancySum / this.films.length;

        let totalConcessionValue = 0;
        if (this.concessions && this.concessions.length > 0) {
            for (const c of this.concessions) {
                totalConcessionValue += c.saleValue || 0;
            }
        }

        this.totals = {
            shows: totalShows,
            ticketsSold: totalTickets,
            grossAmount: parseFloat(totalGross.toFixed(2)),
            netAmount: parseFloat(totalNet.toFixed(2)),
            avgOccupancy: parseFloat(avgOccupancy.toFixed(2)),
            totalConcessionValue: parseFloat(totalConcessionValue.toFixed(2)),
        };
    }
    next();
});

const Report = mongoose.model('Report', reportSchema);

export default Report;
