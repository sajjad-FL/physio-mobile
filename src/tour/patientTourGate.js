import { createContext, useContext, useMemo, useState } from 'react'

const PatientTourGateContext = createContext({
  profileModalBlocking: false,
  setProfileModalBlocking: () => {},
})

export function PatientTourGateProvider({ children }) {
  const [profileModalBlocking, setProfileModalBlocking] = useState(false)
  const value = useMemo(
    () => ({ profileModalBlocking, setProfileModalBlocking }),
    [profileModalBlocking],
  )
  return <PatientTourGateContext.Provider value={value}>{children}</PatientTourGateContext.Provider>
}

export function usePatientTourGate() {
  return useContext(PatientTourGateContext)
}
