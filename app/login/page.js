'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, GraduationCap, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
    const [isSignUp, setIsSignUp] = useState(false)
    const [formData, setFormData] = useState({
        fullName: '',
        studentNumber: '',
        email: '',
        password: '',
        loginIdentifier: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const router = useRouter()

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSignUp = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setMessage('')

        try {
            // Sign up and auto-authenticate the user
            const { data, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        student_number: formData.studentNumber,
                    },
                },
            })

            if (authError) throw authError

            // Auto sign in the user (since we want immediate access)
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password
            })

            if (signInError) throw signInError

            setMessage('Account created successfully! Welcome to FoundIt!')

            // Clear form for security
            setFormData({ fullName: '', studentNumber: '', email: '', password: '', loginIdentifier: '' })

            // Redirect to home
            router.push('/Home')

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSignIn = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            let email = formData.loginIdentifier

            // Check if user entered a student number format (0000-0000)
            if (/^\d{4}-\d{4}$/.test(formData.loginIdentifier)) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('student_number', formData.loginIdentifier)
                    .maybeSingle() // Using maybeSingle to prevent coercion errors

                if (profileError || !profile) {
                    throw new Error('Student number not found. Please use email or register.')
                }

                email = profile.email
            }

            // Authenticate with email/password
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password: formData.password
            })

            if (authError) throw authError

            // Redirect to home upon success
            router.push('/Home')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, rgba(124, 45, 18, 0.2) 100%)' }} className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-black/40 backdrop-blur-2xl border border-orange-500/20 rounded-3xl p-8 shadow-2xl shadow-orange-500/10">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-extrabold gradient-text mb-2 tracking-tight">FoundIt</h1>
                    <p className="text-orange-300/70 text-sm font-semibold">LSPU Lost and Found System</p>
                </div>

                {/* Toggle Buttons */}
                <div className="flex mb-6 bg-black/50 rounded-2xl p-1 border border-orange-500/10">
                    <button
                        type="button"
                        onClick={() => { setIsSignUp(false); setError(''); setMessage(''); }}
                        style={!isSignUp ? { background: 'linear-gradient(90deg, #ff6b35 0%, #ff8c42 100%)' } : {}}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${!isSignUp ? 'text-white shadow-lg shadow-orange-500/30' : 'text-orange-300/60 hover:text-orange-300'}`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => { setIsSignUp(true); setError(''); setMessage(''); }}
                        style={isSignUp ? { background: 'linear-gradient(90deg, #ff6b35 0%, #ff8c42 100%)' } : {}}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${isSignUp ? 'text-white shadow-lg shadow-orange-500/30' : 'text-orange-300/60 hover:text-orange-300'}`}
                    >
                        Sign Up
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm font-semibold animate-pulse">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mb-4 p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm font-semibold">
                        {message}
                    </div>
                )}

                <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
                    {isSignUp && (
                        <>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/60 w-5 h-5 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="Full Name"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    required={isSignUp}
                                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-orange-500/20 rounded-xl text-white placeholder-orange-300/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/50 transition-all"
                                />
                            </div>

                            <div className="relative group">
                                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/60 w-5 h-5 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    type="text"
                                    name="studentNumber"
                                    placeholder="Student ID (0000-0000)"
                                    value={formData.studentNumber}
                                    onChange={handleInputChange}
                                    required={isSignUp}
                                    pattern="\d{4}-\d{4}"
                                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-orange-500/20 rounded-xl text-white placeholder-orange-300/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/50 transition-all"
                                />
                            </div>
                        </>
                    )}

                    <div className="relative group">
                        {isSignUp ? <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/60 w-5 h-5 group-focus-within:text-orange-500 transition-colors" /> : <User className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/60 w-5 h-5 group-focus-within:text-orange-500 transition-colors" />}
                        <input
                            type={isSignUp ? "email" : "text"}
                            name={isSignUp ? "email" : "loginIdentifier"}
                            placeholder={isSignUp ? "LSPU Email" : "Email or Student ID"}
                            value={isSignUp ? formData.email : formData.loginIdentifier}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-orange-500/20 rounded-xl text-white placeholder-orange-300/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/50 transition-all"
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/60 w-5 h-5 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-orange-500/20 rounded-xl text-white placeholder-orange-300/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/50 transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{ background: 'linear-gradient(90deg, #ff6b35 0%, #ff8c42 100%)' }}
                        className="w-full py-4 text-white font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-orange-500/30 hover:opacity-90"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : (
                            isSignUp ? 'Create Account' : 'Sign In'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}