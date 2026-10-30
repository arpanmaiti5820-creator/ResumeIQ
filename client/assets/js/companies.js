/* Company names for the autosuggest on the Company prep form.
   Add or remove names freely. Users can still type any company that is not listed. */
(function () {
    const RIQ = (window.RIQ = window.RIQ || {});

    RIQ.COMPANIES = [
        // Indian IT services
        'TCS (Tata Consultancy Services)', 'Infosys', 'Wipro', 'HCLTech', 'Tech Mahindra', 'Cognizant', 'LTIMindtree',
        'Mphasis', 'Persistent Systems', 'Hexaware', 'Coforge', 'Cyient', 'Zensar', 'Birlasoft', 'Mindtree',
        'L&T Technology Services', 'Tata Elxsi', 'Sonata Software', 'KPIT', 'Happiest Minds', 'Nagarro', 'Thoughtworks',
        // Global IT and consulting
        'Accenture', 'Capgemini', 'IBM', 'Deloitte', 'EY', 'KPMG', 'PwC', 'McKinsey & Company', 'Boston Consulting Group',
        'Bain & Company', 'EPAM Systems', 'Globant', 'Publicis Sapient', 'DXC Technology', 'Genpact', 'Wipro Digital',
        // Indian product and startups
        'Zoho', 'Freshworks', 'Razorpay', 'PhonePe', 'Paytm', 'Flipkart', 'Swiggy', 'Zomato', 'Ola', 'Ola Electric',
        'Myntra', 'Meesho', 'CRED', 'Groww', 'Zerodha', 'Dream11', 'Nykaa', 'BYJU\'S', 'Unacademy', 'upGrad',
        'PhysicsWallah', 'Cars24', 'Delhivery', 'BharatPe', 'Juspay', 'Postman', 'BrowserStack', 'Chargebee', 'Zeta',
        'InMobi', 'ShareChat', 'Dunzo', 'Urban Company', 'MakeMyTrip', 'ixigo', 'OYO', 'Lenskart', 'PolicyBazaar',
        'Zepto', 'Rapido', 'Slice', 'Jupiter', 'Fi Money', 'Licious', 'Udaan', 'Mamaearth', 'Pine Labs', 'Cashfree',
        'Mindtickle', 'Druva', 'Hasura', 'Atlan', 'Sprinklr', 'Darwinbox', 'Whatfix', 'CleverTap', 'MoEngage',
        'Gupshup', 'Exotel', 'Yellow.ai', 'Haptik', 'Rephrase.ai', 'Ather Energy',
        // Big tech
        'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Adobe', 'Salesforce', 'Oracle', 'SAP', 'Intel',
        'NVIDIA', 'AMD', 'Qualcomm', 'Cisco', 'VMware', 'Dell Technologies', 'HP', 'Samsung', 'Sony', 'Texas Instruments',
        'Broadcom', 'Micron', 'Synopsys', 'Cadence', 'Autodesk', 'Intuit', 'ServiceNow', 'Workday', 'Snowflake',
        'Databricks', 'Twilio', 'Zoom', 'Slack', 'Dropbox', 'GitHub', 'GitLab', 'Red Hat', 'Atlassian', 'Stripe',
        'Shopify', 'Spotify', 'LinkedIn', 'X (Twitter)', 'Uber', 'Airbnb', 'PayPal', 'Walmart Global Tech', 'Target',
        'Visa', 'Mastercard', 'American Express', 'OpenAI', 'Anthropic', 'Cloudflare', 'Datadog', 'MongoDB', 'Elastic',
        'Palantir', 'Tesla', 'SpaceX',
        // Banks and finance
        'JPMorgan Chase', 'Goldman Sachs', 'Morgan Stanley', 'Barclays', 'Deutsche Bank', 'Citi', 'Wells Fargo',
        'HSBC', 'Standard Chartered', 'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank',
        'American Express', 'BlackRock', 'Fidelity Investments', 'Nomura', 'UBS',
        // Telecom, engineering, public sector
        'Reliance Jio', 'Airtel', 'Ericsson', 'Nokia', 'Siemens', 'Bosch', 'Philips', 'Honeywell', 'GE', 'Schneider Electric',
        'ABB', 'L&T (Larsen & Toubro)', 'Tata Motors', 'Mahindra', 'Maruti Suzuki', 'Hyundai', 'ISRO', 'DRDO', 'BHEL',
        'ONGC', 'Tata Steel', 'Reliance Industries',
    ];

    // More companies by branch (ECE, electrical, mechanical, civil, chemical, pharma, core PSUs)
    RIQ.COMPANIES = RIQ.COMPANIES.concat([
        // ECE, VLSI, embedded, semiconductors
        'NXP Semiconductors', 'STMicroelectronics', 'Analog Devices', 'Infineon', 'Renesas', 'Microchip Technology',
        'MediaTek', 'Marvell', 'Arm', 'Western Digital', 'Lam Research', 'Applied Materials', 'KLA', 'ASML',
        'GlobalFoundries', 'Siemens EDA', 'Tessolve', 'Sasken', 'MosChip', 'Mirafra', 'Ignitarium', 'Tata Electronics',
        'Samsung Semiconductor India', 'Continental', 'Aptiv', 'Visteon', 'Harman', 'Valeo', 'Denso', 'Lear',
        'Juniper Networks', 'Arista Networks', 'Ciena', 'Tejas Networks', 'HFCL', 'Sterlite Technologies',
        'Vodafone Idea', 'BSNL', 'Bharat Electronics (BEL)', 'ECIL (Electronics Corporation of India)',
        'Dixon Technologies', 'Kaynes Technology', 'Syrma SGS', 'Amber Enterprises',
        // Electrical and power
        'Hitachi Energy', 'GE Vernova', 'Havells', 'Polycab', 'Crompton Greaves Consumer', 'Bajaj Electricals', 'Legrand',
        'Eaton', 'Emerson', 'Rockwell Automation', 'Delta Electronics', 'Vertiv', 'Danfoss', 'Mitsubishi Electric',
        'Toshiba', 'Hitachi', 'NTPC', 'Power Grid Corporation (PGCIL)', 'NHPC', 'Tata Power', 'Adani Power',
        'Adani Green Energy', 'Torrent Power', 'JSW Energy', 'Suzlon', 'Waaree Energies', 'Vikram Solar', 'ReNew',
        'Hero Future Energies', 'CESC', 'Kirloskar Electric', 'Exide Industries', 'Amara Raja', 'NLC India',
        'Coal India', 'NPCIL (Nuclear Power Corporation of India)', 'Engineers India Limited',
        // Mechanical, automotive, manufacturing
        'Toyota Kirloskar', 'Honda Cars India', 'Hero MotoCorp', 'Bajaj Auto', 'TVS Motor', 'Royal Enfield (Eicher Motors)',
        'Ashok Leyland', 'Force Motors', 'Kia India', 'MG Motor India', 'Renault Nissan Technology', 'Ford',
        'General Motors', 'Volkswagen', 'Mercedes-Benz', 'BMW', 'Volvo', 'Cummins', 'Caterpillar', 'John Deere', 'JCB',
        'Bharat Forge', 'Schaeffler', 'SKF', 'Timken', 'Thermax', 'Kirloskar Brothers', 'Godrej & Boyce', 'Voltas',
        'Blue Star', 'Daikin', 'Carrier', 'Whirlpool', 'LG Electronics', 'Tata Technologies', 'Quest Global',
        'Capgemini Engineering', 'Ansys', 'Altair', 'Dassault Systemes', 'Siemens Digital Industries',
        // Aerospace, defence, shipbuilding
        'HAL (Hindustan Aeronautics)', 'Bharat Dynamics', 'BrahMos Aerospace', 'Mazagon Dock', 'Cochin Shipyard',
        'Garden Reach Shipbuilders', 'Tata Advanced Systems', 'Airbus', 'Boeing', 'Lockheed Martin', 'GE Aerospace',
        'Rolls-Royce', 'Safran', 'Pratt & Whitney', 'BARC', 'AAI (Airports Authority of India)',
        // Civil, construction, infrastructure, real estate
        'Tata Projects', 'Shapoorji Pallonji', 'Afcons Infrastructure', 'NCC Limited', 'KEC International',
        'Kalpataru Projects', 'GMR Group', 'Adani Group', 'Godrej Properties', 'DLF', 'Prestige Group', 'Sobha',
        'Brigade Group', 'Lodha', 'Oberoi Realty', 'Puravankara', 'Jacobs', 'AECOM', 'Arup', 'WSP', 'Mott MacDonald',
        'Bechtel', 'Fluor', 'JLL', 'CBRE', 'Cushman & Wakefield', 'HCC (Hindustan Construction Company)',
        'IRB Infrastructure', 'Dilip Buildcon', 'UltraTech Cement', 'ACC', 'Ambuja Cements', 'Shree Cement',
        'Dalmia Bharat', 'NHAI', 'CPWD', 'RITES', 'IRCON', 'RVNL', 'Delhi Metro Rail Corporation (DMRC)',
        'Indian Railways', 'MECON',
        // Metals, mining, oil and gas, chemicals
        'JSW Steel', 'SAIL', 'Jindal Steel & Power', 'Hindalco', 'Vedanta', 'Indian Oil Corporation (IOCL)', 'BPCL',
        'HPCL', 'GAIL', 'Oil India', 'Nayara Energy', 'Shell', 'BP', 'ExxonMobil', 'SLB (Schlumberger)', 'Halliburton',
        'Baker Hughes', 'UPL', 'PI Industries', 'Pidilite', 'Asian Paints', 'Berger Paints', 'Aarti Industries', 'SRF',
        'Tata Chemicals', 'BASF', 'Dow', 'DuPont', 'Linde', 'Air Liquide', '3M',
        // FMCG, pharma, biotech, healthcare devices
        'Hindustan Unilever', 'P&G', 'Nestle', 'ITC', 'Britannia', 'Dabur', 'Godrej Consumer Products',
        'Sun Pharma', "Dr. Reddy's", 'Cipla', 'Lupin', 'Zydus', 'Aurobindo Pharma', 'Biocon', 'Glenmark',
        'Torrent Pharma', "Divi's Laboratories", 'Piramal', 'Mankind Pharma', 'Serum Institute of India',
        'Bharat Biotech', 'Syngene', 'Pfizer', 'Novartis', 'Roche', 'GSK', 'Sanofi', 'Johnson & Johnson', 'Abbott',
        'Medtronic', 'Siemens Healthineers', 'GE Healthcare',
    ]);

    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim();

    /**
     * Returns up to `limit` company names for the typed text.
     * Order: names that start with the text, then names with a word that starts with it, then names that contain it.
     * `recent` (companies the user already used) are listed first inside each group.
     */
    RIQ.matchCompanies = function matchCompanies(query, recent, limit) {
        const q = norm(query);
        const max = limit || 7;
        const seen = new Set();
        const all = [];
        (recent || []).concat(RIQ.COMPANIES).forEach((name) => {
            const key = norm(name);
            if (!key || seen.has(key)) return;
            seen.add(key);
            all.push({ name, key });
        });
        if (!q) return all.slice(0, max).map((c) => c.name);

        const groups = [[], [], []];
        all.forEach((c) => {
            if (c.key.startsWith(q)) groups[0].push(c.name);
            else if (c.key.split(' ').some((w) => w.startsWith(q))) groups[1].push(c.name);
            else if (c.key.includes(q)) groups[2].push(c.name);
        });
        return groups.flat().slice(0, max);
    };
})();