import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'lab_tech' | 'reception' | 'patient' | 'doctor';
      firstName: string;
      lastName: string;
      phone?: string;
      isActive: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'lab_tech' | 'reception' | 'patient' | 'doctor';
    firstName: string;
    lastName: string;
    phone?: string;
    isActive: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'admin' | 'lab_tech' | 'reception' | 'patient' | 'doctor';
    firstName: string;
    lastName: string;
    phone?: string;
    isActive: boolean;
  }
}