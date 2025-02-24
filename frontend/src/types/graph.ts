export interface GraphNode {
    id: string;
    name: string;
    email: string;
    company: string;
    companyDomain: string;
    firstName: string;
    lastName: string;
    linkedinUrl: string;
    notes: string;
    meetings: Array<{
        date: string;
        title: string;
        location: string;
    }>;
} 