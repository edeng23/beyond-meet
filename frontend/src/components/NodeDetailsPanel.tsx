import { FC, useState, useEffect } from 'react';

interface Meeting {
    date: string;
    title: string;
    location: string;
}

interface NodeData {
    id: string;
    email: string;
    name: string;
    company: string;
    companyDomain: string;
    firstName: string;
    lastName: string;
    linkedinUrl: string;
    notes: string;
    meetings: Meeting[];
}

interface NodeDetailsPanelProps {
    node: NodeData | null;
    onClose: () => void;
    userId: string;
}

const NodeDetailsPanel: FC<NodeDetailsPanelProps> = ({ node, onClose, userId }) => {
    const [editedNode, setEditedNode] = useState<NodeData | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setEditedNode(node);
        setIsEditing(false);
    }, [node]);

    const handleSave = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/graph/node/${node.id}?user_id=${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editedNode),
            });

            if (!response.ok) {
                throw new Error('Failed to update node');
            }

            setIsEditing(false);
        } catch (error) {
            console.error('Error updating node:', error);
        }
    };

    const handleInputChange = (field: keyof NodeData, value: string) => {
        setIsEditing(true);
        setEditedNode(prev => prev ? { ...prev, [field]: value } : null);
    };

    if (!node || !editedNode) return null;

    const inputClasses = "bg-transparent border border-gray-700 focus:border-blue-500 text-white px-2 py-1 rounded w-full transition-colors hover:border-gray-600";

    return (
        <div className="fixed right-0 top-0 h-full min-w-[24rem] bg-gray-800 border-l border-gray-700 z-50">
            {/* Fixed Header */}
            <div className="absolute top-0 left-0 right-0 px-6 py-4 bg-gray-800 border-b border-gray-700">
                <input
                    type="text"
                    value={editedNode.email}
                    className="text-2xl font-bold text-white bg-transparent px-2 py-1 rounded cursor-default"
                    readOnly
                />
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors absolute right-6 top-1/2 -translate-y-1/2"
                >
                    ✕
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="space-y-6 px-6 pt-20 pb-24 overflow-y-auto h-full">
                <div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Contact Info</h3>
                    <div className="space-y-2">
                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">Name</label>
                            <input
                                type="text"
                                value={editedNode.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">First Name</label>
                            <input
                                type="text"
                                value={editedNode.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">Last Name</label>
                            <input
                                type="text"
                                value={editedNode.lastName}
                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Company Info</h3>
                    <div className="space-y-2">
                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">Company</label>
                            <input
                                type="text"
                                value={editedNode.company}
                                onChange={(e) => handleInputChange('company', e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">Domain</label>
                            <input
                                type="text"
                                value={editedNode.companyDomain}
                                onChange={(e) => handleInputChange('companyDomain', e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">LinkedIn URL</label>
                            <input
                                type="text"
                                value={editedNode.linkedinUrl}
                                onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Notes</h3>
                    <textarea
                        value={editedNode.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        className={inputClasses}
                    />
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Meetings</h3>
                    {editedNode.meetings && editedNode.meetings.length > 0 ? (
                        <div className="space-y-4 max-h-[300px] overflow-y-auto border border-gray-700 rounded-lg p-4">
                            {editedNode.meetings.map((meeting, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-700/50 rounded-lg p-4 text-gray-300"
                                >
                                    <p className="font-medium">{meeting.title}</p>
                                    <p className="text-sm text-gray-400">
                                        {new Date(meeting.date).toLocaleString()}
                                    </p>
                                    <p className="text-sm text-gray-400">{meeting.location}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 p-4 border border-gray-700 rounded-lg">No meetings found</p>
                    )}
                </div>
            </div>

            {/* Fixed Save Button at bottom */}
            {isEditing && (
                <div className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-gray-800 border-t border-gray-700">
                    <button
                        onClick={handleSave}
                        className="w-full text-blue-400 hover:text-blue-300 transition-colors py-2 rounded border border-blue-400 hover:border-blue-300"
                    >
                        Save Changes
                    </button>
                </div>
            )}
        </div>
    );
};

export default NodeDetailsPanel; 