# Reference screen mapping

The 54 states in `SQLD_Pass_UI_Reference.html` describe a visual and interaction reference. The native app uses real local content and existing controller states; the following mapping avoids substituting the prototype's hard-coded records or reward simulator.

| Reference screens | Native screen or state |
| --- | --- |
| welcome, setup, studySettings | `welcome`, `setup` |
| home, homeNew, examResume | `home` recommendation, empty and active-exam states |
| plan, day | `plan` grid and day cards; `day` detail |
| catalog, searchEmpty, bookmarks | `catalog`, search and bookmark filters |
| lesson, lessonSummary | `lesson`, `lessonSummary` using the actual lesson |
| practiceSetup, practice, practiceCorrect, practiceWrong, practiceResult | `practiceSetup`, `practice` before/after the actual answer save, `practiceResult` |
| review, reviewDetail, reviewEmpty | `review` scheduled/all/empty states and its existing individual review session |
| exams, examIntro, exam, sheet | `exams`, `examIntro`, `exam`, `sheet` |
| submit, examExit, timeout | real confirmation dialogs and an expired-submission notice on `result` |
| result, resultWeak, examReview, examHistory | `result` with actual subject results, `examReview`, `examHistory` |
| stats, calendar | `stats`, `calendar`; activity derives from local records |
| settings, appearance, data | `settings`, `appearance`, `data` |
| reminders | native `reminderSettings` with the existing daily reminder and OS permission state |
| privacy, adsPrivacy | `privacy` plus the actual SDK privacy-options action when available |
| resetLearning, resetAll | existing distinct, explicitly confirmed reset dialogs |
| help, report, about | `help` FAQ, `report`, `notices` |
| unlock, adPlaying, adSuccess, adUnavailable, adCancelled | real opt-in dialog, SDK-owned presentation and controller success/failure/cancellation messages |
| offline | built-in learning remains local; real ad-loading failures explain free alternatives. The app does not claim to detect a network state it has not checked. |
| loading, startupError, storageError | startup/loading and retry screen; real save error notice and operation-specific retry behavior |

The prototype's sample scores, activity dates, demo ad success buttons and fake SDK UI are not shipped. The prototype's weekday reminder selector is not represented as a working feature: the current scheduler supports a daily reminder and its real controls. Restoring records after reinstall/device change is not promised. Reference alignment does not establish device, consent, advertising, accessibility or store-release approval.
