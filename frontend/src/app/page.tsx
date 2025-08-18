import Link from 'next/link';
import SpinnerBorder from '@/components/SpinnerBorder';
import SpinnerButton from '@/components/SpinnerButton';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center text-center mt-16">
      <SpinnerBorder borderRadiusVar="--border-radius-card" className="card max-w-3xl">
        <div className="card-text-content">
          <h1 className="text-6xl font-black mb-4">
            Welcome to <span className="text-[--text-accent]">AgenticAI</span> To-Do
          </h1>
          <p className="text-lg text-[--text-secondary] mb-8">
            This isn't just another to-do list. It's an intelligent task management system
            powered by a conversational AI. Manage your tasks manually, or simply chat
            with your agent to create, update, and organize your life.
          </p>
          <Link href="/todo">
            <SpinnerButton>
              Go to the App
            </SpinnerButton>
          </Link>
        </div>
      </SpinnerBorder>
    </div>
  );
}