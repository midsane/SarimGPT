// pages/api/create-user-profile.js (or in a Next.js Server Action)

import { supabase } from '@/lib/supabase/supabaseClient';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { username, pfp_url, email } = req.body;

        await supabase
            .from('user')
            .select('*')
            .eq('email', email)
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error checking email:', error);
                    res.status(500).json({ error: 'Failed to check email' });
                    return;
                }

                if (data && data.length > 0) {
                    // Email already exists
                    res.status(409).json({ error: 'Email already exists' });
                    return;
                }
            });

        try {
            const { data, error } = await supabase
                .from('user')
                .upsert({
                    username: username,
                    email: email,
                    pfp_url: pfp_url,
                });

            if (error) {
                throw error;
            }

            res.status(200).json({ message: 'User profile created successfully', data });
        } catch (err) {
            console.error('Error creating user profile:', err);
            res.status(500).json({ error: 'Failed to create user profile' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}