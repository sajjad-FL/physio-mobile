import { isPhysioDegreeOption } from '../constants/physioQualification'
import { isValidIdProofType } from '../constants/idProofTypes'
import { validateIndianMobile } from './phoneIndia'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Must match server `MAX_UPLOAD_BYTES` (2MB) */
const MAX_FILE_BYTES = 2 * 1024 * 1024

export function validateEmailOptional(email) {
  const s = String(email ?? '').trim()
  if (!s) return { ok: true }
  if (s.length > 254) return { ok: false, message: 'Email is too long' }
  if (!EMAIL_RE.test(s)) return { ok: false, message: 'Enter a valid email address' }
  return { ok: true }
}

export function validateBasicSection(basic) {
  const errors = {}
  const name = String(basic?.name ?? '').trim()
  if (!name) errors.name = 'Full name is required'
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters'
  else if (name.length > 120) errors.name = 'Name is too long'

  const emailTrim = String(basic?.email ?? '').trim()
  if (!emailTrim) errors.email = 'Email is required'
  else {
    const emailCheck = validateEmailOptional(emailTrim)
    if (!emailCheck.ok) errors.email = emailCheck.message
  }

  const loc = String(basic?.location ?? '').trim()
  if (!loc) errors.location = 'Coverage / location is required'
  else if (loc.length < 2) errors.location = 'Location must be at least 2 characters'
  else if (loc.length > 300) errors.location = 'Location is too long'

  if (basic?.dob != null && String(basic.dob).trim()) {
    const d = new Date(basic.dob)
    if (Number.isNaN(d.getTime())) errors.dob = 'Invalid date of birth'
    else {
      const now = new Date()
      if (d > now) errors.dob = 'Date of birth cannot be in the future'
      const age = (now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      if (age < 18) errors.dob = 'You must be at least 18 years old'
      if (age > 100) errors.dob = 'Please check the date of birth'
    }
  }

  const gender = String(basic?.gender ?? '').trim()
  if (gender && !['female', 'male', 'other', 'prefer_not_to_say'].includes(gender)) {
    errors.gender = 'Select a valid option'
  }

  const address = String(basic?.address ?? '').trim()
  if (address.length > 500) errors.address = 'Address is too long (max 500 characters)'

  return { errors }
}

export function validateQualificationSection(qualification) {
  const errors = {}
  const degree = String(qualification?.degree ?? '').trim()
  if (!degree) errors.degree = 'Degree is required'
  else if (!isPhysioDegreeOption(degree)) errors.degree = 'Select BPT or MPT'

  const university = String(qualification?.university ?? '').trim()
  if (!university) errors.university = 'University is required'
  else if (university.length > 200) errors.university = 'University name is too long'

  if (qualification?.year != null && qualification.year !== '') {
    const y = Number(qualification.year)
    const current = new Date().getFullYear()
    if (!Number.isFinite(y)) errors.year = 'Enter a valid passing year'
    else if (y < 1950 || y > current + 1) errors.year = `Passing year must be between 1950 and ${current + 1}`
  } else {
    errors.year = 'Passing year is required'
  }

  const reg = String(qualification?.registrationNumber ?? '').trim()
  if (reg) {
    if (reg.length < 3) errors.registrationNumber = 'Council registration number is too short'
    else if (reg.length > 80) errors.registrationNumber = 'Council registration number is too long'
  }

  return { errors }
}

export function validatePracticeSection(practice) {
  const errors = {}
  if (practice?.experience == null || practice.experience === '') {
    errors.experience = 'Experience (years) is required'
  } else {
    const e = Number(practice.experience)
    if (!Number.isFinite(e) || e < 0) errors.experience = 'Enter a valid number of years'
    else if (e > 80) errors.experience = 'Enter a realistic experience value'
  }

  const spec = String(practice?.specialization ?? '').trim()
  if (!spec) errors.specialization = 'Specialization is required'
  else if (spec.length < 2) errors.specialization = 'Specialization must be at least 2 characters'
  else if (spec.length > 120) errors.specialization = 'Specialization is too long'

  const st = practice?.serviceType
  if (st != null && st !== '' && !['online', 'home', 'both'].includes(st)) {
    errors.serviceType = 'Invalid service type'
  }

  const raw = practice?.areas
  const areaList =
    typeof raw === 'string'
      ? raw
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : Array.isArray(raw)
        ? raw.map((s) => String(s).trim()).filter(Boolean)
        : []
  if (areaList.length === 0) errors.areas = 'Add at least one service area'

  return { errors }
}

export function validateRegistrationAccount({ phone, password }) {
  const errors = {}
  const pv = validateIndianMobile(phone)
  if (!pv.valid) errors.phone = pv.message
  if (!password || String(password).length < 6) {
    errors.password = 'Password must be at least 6 characters'
  }
  return { errors }
}

/** @param {{ uri?: string, mimeType?: string, name?: string, size?: number }} asset */
export function validateFileAsset(asset, label = 'File') {
  if (!asset) return { ok: true }
  const size = Number(asset.size ?? 0)
  if (size && size > MAX_FILE_BYTES) {
    return { ok: false, message: `${label} must be 2MB or smaller` }
  }
  const mime = String(asset.mimeType || '').toLowerCase()
  const okType =
    mime.startsWith('image/') ||
    mime === 'application/pdf' ||
    mime === '' ||
    mime === 'application/octet-stream'
  if (!okType) {
    return { ok: false, message: `${label} must be an image (JPEG, PNG, WebP) or PDF` }
  }
  return { ok: true }
}

export function validateAvatarFile(asset, { required = false } = {}) {
  if (!asset) {
    if (required) return { ok: false, message: 'Passport size photo is required' }
    return { ok: true }
  }
  const size = Number(asset.size ?? 0)
  if (size && size > MAX_FILE_BYTES) {
    return { ok: false, message: 'Profile photo must be 2MB or smaller' }
  }
  const mime = String(asset.mimeType || '').toLowerCase()
  if (
    mime &&
    !mime.startsWith('image/') &&
    mime !== 'application/octet-stream'
  ) {
    return { ok: false, message: 'Profile photo must be an image' }
  }
  return { ok: true }
}

function fileHasAsset(file) {
  return Boolean(file && typeof file === 'object' && file.uri)
}

function hasInternshipCoverage(files = {}, existing = {}) {
  const picked = Array.isArray(files.fInternships)
    ? files.fInternships.filter(fileHasAsset)
    : fileHasAsset(files.fInternship)
      ? [files.fInternship]
      : []
  const existingUrls = Array.isArray(existing.internshipCertificates)
    ? existing.internshipCertificates.filter((u) => String(u || '').trim())
    : String(existing.internship || '').trim()
      ? [String(existing.internship).trim()]
      : []
  return picked.length > 0 || existingUrls.length > 0
}

/**
 * @param {{ fCertificate?: unknown, fIdProof?: unknown, fRegCert?: unknown, fSelfie?: unknown, fInternship?: unknown, fInternships?: unknown[], fSignedNda?: unknown }} files
 * @param {{ certificate?: string, idProof?: string, registration?: string, selfie?: string, internship?: string, internshipCertificates?: string[], signedNda?: string }} [existing]
 * @param {{ requireSignedNda?: boolean, requireQualificationDeclaration?: boolean, declarationAccepted?: boolean, idProofType?: string }} [opts]
 */
export function validateDocumentsStep(files = {}, existing = {}, opts = {}) {
  const errors = {}
  const hasUrlOrFile = (url, file) => Boolean(String(url || '').trim()) || fileHasAsset(file)

  if (!hasUrlOrFile(existing.certificate, files.fCertificate)) {
    errors.certificate = 'BPT/MPT pass certificate is required'
  }
  if (!hasInternshipCoverage(files, existing)) {
    errors.internshipCertificate = 'Upload at least one internship certificate'
  }
  if (!hasUrlOrFile(existing.idProof, files.fIdProof)) {
    errors.idProof = 'GOVERNMENT ID is required'
  }
  if (!hasUrlOrFile(existing.selfie, files.fSelfie)) {
    errors.selfieWithId = 'Selfie with ID is required'
  }

  const idType = opts.idProofType != null ? String(opts.idProofType).trim().toLowerCase() : ''
  if (hasUrlOrFile(existing.idProof, files.fIdProof) && !isValidIdProofType(idType)) {
    errors.idProofType = 'Select GOVT ID type (Aadhaar, PAN, Passport, or Voter ID)'
  }
  if (opts.requireSignedNda && !hasUrlOrFile(existing.signedNda, files.fSignedNda)) {
    errors.signedNda = 'Download the NDA, sign it, and upload the signed copy'
  }
  if (opts.requireQualificationDeclaration && !opts.declarationAccepted) {
    errors.qualificationDeclaration = 'You must agree to the qualification declaration'
  }
  return { errors, ok: Object.keys(errors).length === 0 }
}

function hasUrl(s) {
  return Boolean(s && String(s).trim())
}

/**
 * Mirrors client onboarding final submit gate.
 */
export function validateSubmitForm(values) {
  const errors = {}
  const basic = {
    name: values.name,
    email: values.email,
    location: values.location,
    dob: values.dob,
    gender: values.gender,
    address: values.address,
  }
  Object.assign(errors, validateBasicSection(basic).errors)

  Object.assign(
    errors,
    validateQualificationSection({
      degree: values.degree,
      university: values.university,
      year: values.year,
      registrationNumber: values.registrationNumber,
    }).errors,
  )

  Object.assign(
    errors,
    validatePracticeSection({
      experience: values.experience,
      specialization: values.specialization,
      serviceType: values.serviceType,
      areas: values.areas,
    }).errors,
  )

  if (!hasUrl(values.docCertificate)) errors.certificate = 'Upload your BPT/MPT pass certificate'
  if (!hasUrl(values.docIdProof)) errors.idProof = 'Upload your GOVERNMENT ID'
  if (!hasUrl(values.docSelfie)) errors.selfieWithId = 'Upload a selfie with your ID'

  const internshipUrls = Array.isArray(values.docInternshipCertificates)
    ? values.docInternshipCertificates.filter((u) => String(u || '').trim())
    : hasUrl(values.docInternship)
      ? [String(values.docInternship).trim()]
      : []
  if (internshipUrls.length === 0) {
    errors.internshipCertificate = 'Upload at least one internship certificate'
  }

  if (!isValidIdProofType(values.idProofType)) {
    errors.idProofType =
      'Select the GOVT ID type you uploaded (Aadhaar, PAN, Passport, or Voter ID)'
  }

  if (values.requireSignedNda && !hasUrl(values.docSignedNda)) {
    errors.signedNda = 'Download the NDA, sign it, and upload the signed copy'
  }

  if (values.requireQualificationDeclaration) {
    const accepted =
      values.qualificationDeclarationAccepted === true ||
      (values.qualificationDeclarationAcceptedAt != null &&
        String(values.qualificationDeclarationAcceptedAt).trim() !== '')
    const legacyNda = hasUrl(values.docSignedNda)
    if (!accepted && !legacyNda) {
      errors.qualificationDeclaration = 'Confirm the qualification declaration to continue'
    }
  }

  return { errors, ok: Object.keys(errors).length === 0 }
}
