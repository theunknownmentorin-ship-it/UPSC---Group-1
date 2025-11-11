import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

const SYLLABUS_DATA = [
    {
        id: 'gs1', name: 'General Studies Paper I', weightage: 30, estimatedHours: 160,
        topics: [
            { id: 'gs1_1', name: 'Current events of national and international importance' }, { id: 'gs1_2', name: 'History of India and Indian National Movement' }, { id: 'gs1_3', name: 'Indian and World Geography' }, { id: 'gs1_4', name: 'Indian Polity and Governance' }, { id: 'gs1_5', name: 'Economic and Social Development' }, { id: 'gs1_6', name: 'General issues on Environmental ecology, Bio-diversity and Climate Change' }, { id: 'gs1_7', name: 'General Science' },
        ],
    },
    {
        id: 'gs2', name: 'General Studies Paper II (CSAT)', weightage: 20, estimatedHours: 100,
        topics: [
            { id: 'gs2_1', name: 'Comprehension' }, { id: 'gs2_2', name: 'Interpersonal skills including communication skills' }, { id: 'gs2_3', name: 'Logical reasoning and analytical ability' }, { id: 'gs2_4', name: 'Decision making and problem solving' }, { id: 'gs2_5', name: 'General mental ability' }, { id: 'gs2_6', name: 'Basic numeracy and Data interpretation' },
        ],
    },
    {
        id: 'optional1', name: 'Optional Subject Paper I', weightage: 25, estimatedHours: 200,
        topics: [
            { id: 'op1_1', name: 'Topic 1' }, { id: 'op1_2', name: 'Topic 2' }, { id: 'op1_3', name: 'Topic 3' }, { id: 'op1_4', name: 'Topic 4' }, { id: 'op1_5', name: 'Topic 5' },
        ]
    },
    {
        id: 'optional2', name: 'Optional Subject Paper II', weightage: 25, estimatedHours: 200,
        topics: [
            { id: 'op2_1', name: 'Topic 6' }, { id: 'op2_2', name: 'Topic 7' }, { id: 'op2_3', name: 'Topic 8' }, { id: 'op2_4', name: 'Topic 9' }, { id: 'op2_5', name: 'Topic 10' },
        ]
    }
];

const PACE_MULTIPLIERS = { Slow: 1.25, Normal: 1.0, Fast: 0.75 };
const STATUS_OPTIONS = ['Not Started', 'Studied', 'Revised', 'Tested'];
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const initializeSyllabus = (syllabusTemplate) => {
    return syllabusTemplate.map(subject => ({
        ...subject,
        topics: subject.topics.map(topic => ({ ...topic, status: 'Not Started', testScores: [] }))
    }));
};

const App = () => {
    const [settings, setSettings] = useState(null);
    const [syllabus, setSyllabus] = useState(null);
    const [schedule, setSchedule] = useState(null);
    const [theme, setTheme] = useState(() => localStorage.getItem('upsec_theme') || 'light');

    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem('upsec_settings');
            const savedSyllabus = localStorage.getItem('upsec_syllabus');
            const savedSchedule = localStorage.getItem('upsec_schedule');

            if (savedSettings && savedSyllabus && savedSchedule) {
                setSettings(JSON.parse(savedSettings));
                setSyllabus(JSON.parse(savedSyllabus));
                setSchedule(JSON.parse(savedSchedule));
            } else {
                setSyllabus(initializeSyllabus(SYLLABUS_DATA));
            }
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
            setSyllabus(initializeSyllabus(SYLLABUS_DATA));
        }
    }, []);

    useEffect(() => {
        document.body.className = theme === 'dark' ? 'dark-mode' : '';
        localStorage.setItem('upsec_theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

    const handleGeneratePlan = (userSettings) => {
        const { hoursPerWeek, pace, downtimeDays } = userSettings;
        const paceMultiplier = PACE_MULTIPLIERS[pace];
        const initialSyllabus = initializeSyllabus(SYLLABUS_DATA);

        const allTopics = initialSyllabus.flatMap(subject => {
            const hoursPerTopic = (subject.estimatedHours * paceMultiplier) / subject.topics.length;
            return subject.topics.map(topic => ({ ...topic, subjectName: subject.name, hours: hoursPerTopic }));
        });

        const newSchedule = [];
        let week = { week: 1, topics: [], hours: 0 };
        const studyDaysPerWeek = 7 - downtimeDays.length;
        if (studyDaysPerWeek <= 0) {
            alert("You need to select at least one study day per week!");
            return;
        }
        
        const effectiveHoursPerWeek = (hoursPerWeek / 7) * studyDaysPerWeek;
        let remainingHoursInWeek = effectiveHoursPerWeek;

        allTopics.forEach(topic => {
            let hoursToAssign = topic.hours;
            while (hoursToAssign > 0) {
                if (remainingHoursInWeek <= 0) {
                    newSchedule.push(week);
                    week = { week: week.week + 1, topics: [], hours: 0 };
                    remainingHoursInWeek = effectiveHoursPerWeek;
                }

                const assignableHours = Math.min(hoursToAssign, remainingHoursInWeek);
                const existingTopic = week.topics.find(t => t.id === topic.id);
                if (existingTopic) {
                    existingTopic.hours += assignableHours;
                } else {
                    week.topics.push({ id: topic.id, name: topic.name, subjectName: topic.subjectName, hours: assignableHours });
                }

                week.hours += assignableHours;
                hoursToAssign -= assignableHours;
                remainingHoursInWeek -= assignableHours;
            }
        });
        if (week.topics.length > 0) newSchedule.push(week);

        const finalSettings = { ...userSettings, startDate: new Date().toISOString(), planId: `UPSEC-${Date.now().toString(36).toUpperCase()}` };
        setSyllabus(initialSyllabus);
        setSettings(finalSettings);
        setSchedule(newSchedule);

        localStorage.setItem('upsec_settings', JSON.stringify(finalSettings));
        localStorage.setItem('upsec_syllabus', JSON.stringify(initialSyllabus));
        localStorage.setItem('upsec_schedule', JSON.stringify(newSchedule));
    };

    const handleSyllabusUpdate = (newSyllabus) => {
        setSyllabus(newSyllabus);
        localStorage.setItem('upsec_syllabus', JSON.stringify(newSyllabus));
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset all your progress and settings? This action cannot be undone.")) {
            localStorage.clear();
            setSettings(null);
            setSchedule(null);
            setSyllabus(initializeSyllabus(SYLLABUS_DATA));
        }
    };

    return (
        <div className="app-container">
            <header className="header">
                <button onClick={toggleTheme} className="theme-toggle-btn" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                    {theme === 'light' ? '🌙' : '☀️'}
                </button>
                <h1>UPSEC Exam Workflow</h1>
                <p>Your personalized dashboard to conquer the exam</p>
            </header>
            {!settings || !schedule ? (
                <SetupWizard onGeneratePlan={handleGeneratePlan} />
            ) : (
                <PlannerScreen
                    settings={settings}
                    syllabus={syllabus}
                    schedule={schedule}
                    onSyllabusUpdate={handleSyllabusUpdate}
                    onReset={handleReset}
                />
            )}
        </div>
    );
};

const SetupWizard = ({ onGeneratePlan }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        gender: 'Female',
        hoursPerWeek: 20,
        pace: 'Normal',
        examDate: (() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toISOString().split('T')[0]; })(),
        downtimeDays: [0, 6], // Sunday, Saturday
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleDowntimeChange = (dayIndex) => {
        setFormData(prev => {
            const newDowntime = prev.downtimeDays.includes(dayIndex)
                ? prev.downtimeDays.filter(d => d !== dayIndex)
                : [...prev.downtimeDays, dayIndex];
            return { ...prev, downtimeDays: newDowntime };
        });
    };

    const nextStep = () => setStep(s => Math.min(s + 1, 4));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));
    const handleSubmit = () => onGeneratePlan(formData);

    const steps = ["Welcome", "Study Style", "Timeline", "Review"];

    return (
        <div className="setup-wizard">
            <div className="wizard-progress">
                <div className="wizard-progress-bar" style={{width: `${((step - 1) / (steps.length - 1)) * 100}%`}}></div>
                {steps.map((name, index) => (
                    <div className={`progress-step ${step >= index + 1 ? 'active' : ''}`} key={name}>
                        <div className="step-dot">{index + 1}</div>
                        <span>{name}</span>
                    </div>
                ))}
            </div>
            {step === 1 && <WizardStep1 data={formData} setData={setFormData} />}
            {step === 2 && <WizardStep2 data={formData} setData={setFormData} />}
            {step === 3 && <WizardStep3 data={formData} onDowntimeChange={handleDowntimeChange} setData={setFormData} />}
            {step === 4 && <WizardStep4 data={formData} />}

            <div className="wizard-navigation">
                <button onClick={prevStep} disabled={step === 1} className="btn btn-secondary">Back</button>
                {step < 4 && <button onClick={nextStep} className="btn btn-primary">Next</button>}
                {step === 4 && <button onClick={handleSubmit} className="btn btn-primary">Generate My Plan</button>}
            </div>
        </div>
    );
};

const WizardStep1 = ({ data, setData }) => (
    <div className="wizard-step">
        <h2>Welcome, Future Officer!</h2>
        <div className="form-group">
            <label htmlFor="name">What should we call you?</label>
            <input type="text" id="name" value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder="e.g., Alex" required />
        </div>
        <div className="form-group">
            <label>Choose Your Character</label>
            <div className="gender-selector">
                <input type="radio" id="female" name="gender" value="Female" checked={data.gender === 'Female'} onChange={e => setData({...data, gender: e.target.value})} />
                <label htmlFor="female">Female</label>
                <input type="radio" id="male" name="gender" value="Male" checked={data.gender === 'Male'} onChange={e => setData({...data, gender: e.target.value})} />
                <label htmlFor="male">Male</label>
            </div>
        </div>
    </div>
);

const WizardStep2 = ({ data, setData }) => (
    <div className="wizard-step">
        <h2>Your Study Style</h2>
        <div className="form-group">
            <label htmlFor="hoursPerWeek">Available Study Hours per Week</label>
            <input type="number" id="hoursPerWeek" value={data.hoursPerWeek} onChange={e => setData({...data, hoursPerWeek: Number(e.target.value)})} min="1" max="100" required />
        </div>
        <div className="form-group">
            <label htmlFor="pace">Preferred Learning Pace</label>
            <select id="pace" value={data.pace} onChange={e => setData({...data, pace: e.target.value})}>
                {Object.keys(PACE_MULTIPLIERS).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
        </div>
    </div>
);

const WizardStep3 = ({ data, setData, onDowntimeChange }) => (
    <div className="wizard-step">
        <h2>Timeline & Breaks</h2>
        <div className="form-group">
            <label htmlFor="examDate">Target Exam Date</label>
            <input type="date" id="examDate" value={data.examDate} onChange={e => setData({...data, examDate: e.target.value})} required />
        </div>
        <div className="form-group">
            <label>Downtime Days (select days to take off)</label>
            <div className="downtime-selector">
                {DAYS_OF_WEEK.map((day, index) => (
                    <div key={day}>
                        <input type="checkbox" id={`day-${index}`} checked={data.downtimeDays.includes(index)} onChange={() => onDowntimeChange(index)} />
                        <label htmlFor={`day-${index}`}>{day.substring(0,3)}</label>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const WizardStep4 = ({ data }) => (
    <div className="wizard-step">
        <h2>Review Your Plan</h2>
        <ul className="review-details">
            <li>Name: <strong>{data.name || 'Not set'}</strong></li>
            <li>Weekly Hours: <strong>{data.hoursPerWeek}</strong></li>
            <li>Pace: <strong>{data.pace}</strong></li>
            <li>Exam Date: <strong>{new Date(data.examDate).toLocaleDateString()}</strong></li>
            <li>Downtime: <strong>{data.downtimeDays.length > 0 ? data.downtimeDays.map(d => DAYS_OF_WEEK[d]).join(', ') : 'None'}</strong></li>
        </ul>
    </div>
);


const PlannerScreen = ({ settings, syllabus, schedule, onSyllabusUpdate, onReset }) => {
    const [activeTab, setActiveTab] = useState('schedule');
    
    const progressStats = useMemo(() => {
        const allTopics = syllabus.flatMap(s => s.topics);
        const total = allTopics.length;
        if (total === 0) return { total: 0, completed: 0, progressPercentage: 0 };
        const statusCounts = allTopics.reduce((acc, topic) => {
            acc[topic.status] = (acc[topic.status] || 0) + 1;
            return acc;
        }, {});
        const completed = total - (statusCounts['Not Started'] || 0);
        return {
            total, completed, progressPercentage: (completed / total) * 100,
            notStarted: statusCounts['Not Started'] || 0, studied: statusCounts['Studied'] || 0,
            revised: statusCounts['Revised'] || 0, tested: statusCounts['Tested'] || 0,
        };
    }, [syllabus]);
    
    return (
        <div className="planner-dashboard">
            <div className="main-content">
                 <div className="card">
                    <nav className="tab-nav">
                        <button className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>Weekly Plan</button>
                        <button className={`tab-btn ${activeTab === 'syllabus' ? 'active' : ''}`} onClick={() => setActiveTab('syllabus')}>Syllabus Tracker</button>
                    </nav>
                    {activeTab === 'schedule' ? <ScheduleView schedule={schedule} settings={settings} /> : <SyllabusView syllabus={syllabus} onSyllabusUpdate={onSyllabusUpdate} />}
                </div>
            </div>
            <aside className="sidebar">
                {/* FIX: Pass the entire 'settings' object to ProgressAnimation for consistency and to resolve the scope error. */}
                <ProgressAnimation progress={progressStats.progressPercentage} settings={settings} />
                <DeadlineView settings={settings} schedule={schedule} progress={progressStats.progressPercentage} />
                <ProgressView stats={progressStats} />
                <div className="card reset-button">
                    <button onClick={onReset} className="btn-danger">Reset Plan & Progress</button>
                </div>
            </aside>
        </div>
    );
};


// FIX: Update ProgressAnimation to accept the 'settings' object as a prop and use it to access 'name' and 'gender'.
const ProgressAnimation = ({ progress, settings }) => {
    const maleCharacter = (<><circle className="character-head" cx="25" cy="45" r="8" /><path className="character-body" d="M25,53 L25,80 M25,60 L10,75 M25,60 L40,75 M25,80 L15,100 M25,80 L35,100" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></>);
    const femaleCharacter = (<><circle className="character-head" cx="25" cy="45" r="8" /><path className="character-body" d="M25,53 L25,80 M25,60 L10,75 M25,60 L40,75 M15,100 L25,80 L35,100 Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" /></>);

    const getStonePath = (p) => {
        const factor = ((t) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t)(Math.min(p / 100, 1));
        const interpolate = (start, end, f) => start + (end - start) * f;
        const sq = [{x: 50, y: 60}, {x: 80, y: 60}, {x: 80, y: 90}, {x: 50, y: 90}];
        const c = {x: 65, y: 75, r: 15};
        const cp = [{x:c.x,y:c.y-c.r},{x:c.x+c.r,y:c.y},{x:c.x,y:c.y+c.r},{x:c.x-c.r,y:c.y}];
        const m = sq.map((pt, i) => ({ x: interpolate(pt.x, cp[i].x, factor), y: interpolate(pt.y, cp[i].y, factor) }));
        const curve = interpolate(0, c.r * 0.55228, factor);
        return `M${m[0].x},${m[0].y} C${m[0].x+curve},${m[0].y} ${m[1].x-curve},${m[1].y} ${m[1].x},${m[1].y} S${m[2].x},${m[1].y+curve} ${m[2].x},${m[2].y} S${m[2].x-curve},${m[3].y} ${m[3].x},${m[3].y} S${m[0].x},${m[3].y-curve} ${m[0].x},${m[0].y} Z`;
    };
    
    return (
        <div className="card">
             <h3>Your Journey, {settings.name}</h3>
            <div className="progress-animation-container">
                <svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet">
                    <path className="ground-path" d="M0,100 H400" />
                    <g className="character-group" style={{ transform: `translateX(${progress * 2.8}px)` }}>
                        {settings.gender === 'Male' ? maleCharacter : femaleCharacter}
                        <path className="stone-path" d={getStonePath(progress)} />
                    </g>
                </svg>
            </div>
        </div>
    );
};

const DeadlineView = ({ settings, schedule, progress }) => {
    const { examDate, startDate, planId } = settings;
    
    const daysRemaining = useMemo(() => {
        const today = new Date();
        const target = new Date(examDate);
        today.setHours(0,0,0,0);
        target.setHours(0,0,0,0);
        const diffTime = target.getTime() - today.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }, [examDate]);

    const { status, message } = useMemo(() => {
        const totalDaysInPlan = schedule.length * 7;
        const daysPassed = Math.floor((new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
        const expectedProgress = Math.min(100, (daysPassed / totalDaysInPlan) * 100);
        const difference = progress - expectedProgress;
        if (difference < -10) return { status: 'way-behind', message: "Significantly behind schedule!" };
        if (difference < -5) return { status: 'behind', message: "A bit behind, time to catch up!" };
        return { status: 'on-track', message: "You're on track. Keep it up!" };
    }, [settings, schedule, progress]);
    
    return (
        <div className="card">
            <h3>Deadline Tracker</h3>
            <div className="deadline-info">
                 <div className="deadline-info-item"><div className="value">{daysRemaining}</div><div className="label">Days Left</div></div>
                 <div className="deadline-info-item"><div className="value">{new Date(examDate).toLocaleDateString()}</div><div className="label">Target Date</div></div>
            </div>
            <div className={`status-alert ${status}`}>{message}</div>
            <div className="plan-id-display">Plan ID: <code>{planId}</code></div>
        </div>
    );
};


const ProgressView = ({ stats }) => (
    <div className="card">
        <h3>Overall Progress</h3>
        <div className="progress-summary">
            <p>{stats.completed} of {stats.total} topics covered</p>
            <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${stats.progressPercentage}%` }}>
                    {stats.progressPercentage > 10 && `${Math.round(stats.progressPercentage)}%`}
                </div>
            </div>
        </div>
        <div className="status-breakdown">
            <div className="status-item"><div className="count not-started">{stats.notStarted}</div><div className="label">Not Started</div></div>
            <div className="status-item"><div className="count studied">{stats.studied}</div><div className="label">Studied</div></div>
            <div className="status-item"><div className="count revised">{stats.revised}</div><div className="label">Revised</div></div>
            <div className="status-item"><div className="count tested">{stats.tested}</div><div className="label">Tested</div></div>
        </div>
    </div>
);

const SyllabusView = ({ syllabus, onSyllabusUpdate }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [currentTarget, setCurrentTarget] = useState({ subjectId: null, topicId: null });

    const handleStatusChange = (subjectId, topicId, newStatus) => {
        const newSyllabus = syllabus.map(s => s.id === subjectId ? { ...s, topics: s.topics.map(t => t.id === topicId ? { ...t, status: newStatus } : t) } : s);
        onSyllabusUpdate(newSyllabus);
        if (newStatus === 'Tested') {
            setCurrentTarget({ subjectId, topicId });
            setModalOpen(true);
        }
    };

    const handleAddScore = (score) => {
        const { subjectId, topicId } = currentTarget;
        const newSyllabus = syllabus.map(s => s.id === subjectId ? { ...s, topics: s.topics.map(t => t.id === topicId ? { ...t, testScores: [...t.testScores, score] } : t) } : s);
        onSyllabusUpdate(newSyllabus);
        setModalOpen(false);
    };

    return (
        <div className="syllabus-container">
            {syllabus.map(subject => (
                <div key={subject.id} className="subject-card">
                    <div className="subject-header"><h4>{subject.name}</h4><span className="weightage-badge">{subject.weightage}% Weightage</span></div>
                    <ul className="topic-list">
                        {subject.topics.map(topic => (
                            <li key={topic.id} className="topic-item">
                                <div className="topic-details">
                                    <span>{topic.name}</span>
                                    <select className="topic-status-selector" value={topic.status} onChange={e => handleStatusChange(subject.id, topic.id, e.target.value)}>
                                        {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                                    </select>
                                </div>
                                {topic.testScores.length > 0 && <div className="test-scores">Test Scores: {topic.testScores.map((s, i) => <span key={i}>{s}%</span>)}</div>}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            {modalOpen && <ScoreModal onAddScore={handleAddScore} onClose={() => setModalOpen(false)} />}
        </div>
    );
};

const ScoreModal = ({ onAddScore, onClose }) => {
    const [score, setScore] = useState(80);
    const handleSubmit = (e) => { e.preventDefault(); if (score >= 0 && score <= 100) onAddScore(score); };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h4>Log Test Score</h4>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="score">Score (%)</label>
                        <input type="number" id="score" value={score} onChange={e => setScore(Number(e.target.value))} min="0" max="100" autoFocus />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Score</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const ScheduleView = ({ schedule, settings }) => {
    const currentWeek = useMemo(() => {
        if (!settings.startDate) return 1;
        const daysPassed = Math.floor((new Date().getTime() - new Date(settings.startDate).getTime()) / (1000 * 60 * 60 * 24));
        return Math.floor(daysPassed / 7) + 1;
    }, [settings.startDate]);

    const [displayedWeek, setDisplayedWeek] = useState(currentWeek);
    const [animationClass, setAnimationClass] = useState('');

    const weekData = schedule.find(w => w.week === displayedWeek);

    const changeWeek = (direction) => {
        const nextWeek = displayedWeek + direction;
        if (nextWeek > 0 && nextWeek <= schedule.length) {
            setAnimationClass(direction > 0 ? '' : 'reverse');
            setDisplayedWeek(nextWeek);
        }
    };

    return (
        <div className="schedule-view-container">
            <div className="schedule-header">
                <div className="schedule-nav">
                    <button onClick={() => changeWeek(-1)} disabled={displayedWeek === 1} className="btn btn-secondary">&lt; Prev</button>
                    <button onClick={() => changeWeek(1)} disabled={displayedWeek === schedule.length} className="btn btn-secondary">Next &gt;</button>
                </div>
                <h4>Week {displayedWeek} {displayedWeek === currentWeek && "(Current)"}</h4>
            </div>
             {weekData ? (
                <div key={displayedWeek} className={`schedule-week-content ${animationClass}`}>
                    <ul className="schedule-list">
                        {weekData.topics.map((topic, index) => (
                            <li key={`${topic.id}-${index}`} className="schedule-topic">
                                <strong>{topic.name}</strong><br />
                                <span>{topic.subjectName} - approx. {topic.hours.toFixed(1)} hrs</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : <p>No topics scheduled for this week.</p>}
        </div>
    );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);