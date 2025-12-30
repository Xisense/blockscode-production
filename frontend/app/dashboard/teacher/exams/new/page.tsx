"use client";
import React, { Suspense } from 'react';
import ExamBuilder from '@/app/components/Authoring/ExamBuilder';
import Loading from '@/app/loading';

export default function CreateExamPage() {
    return (
        <Suspense fallback={<Loading />}>
            <div className="min-h-screen bg-white">
                <ExamBuilder />
            </div>
        </Suspense>
    );
}
