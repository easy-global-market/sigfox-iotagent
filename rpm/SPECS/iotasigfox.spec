Summary: Sigfox IoT Agent
Name: iotagent-sigfox
Version: %{_product_version}
Release: %{_product_release}
License: AGPLv3
BuildRoot: %{_topdir}/BUILDROOT/
BuildArch: x86_64
# Requires: nodejs >= 0.10.24
Requires: logrotate
Requires(post): /sbin/chkconfig, /usr/sbin/useradd npm
Requires(preun): /sbin/chkconfig, /sbin/service
Requires(postun): /sbin/service
Group: Applications/Engineering
Vendor: Telefonica I+D

%description
IoT Agent for the Sigfox protocol.

This component was designed to work alongside other Telefonica IoT Platform components.

# System folders
%define _srcdir $RPM_BUILD_ROOT/../../..
%define _service_name iotasigfox
%define _install_dir /opt/iotasigfox
%define _iotasigfox_log_dir /var/log/iotasigfox
%define _iotasigfox_pid_dir /var/run/iotasigfox
%define _iotasigfox_conf_dir /etc/iotasigfox.d


%define _iotasigfox_executable iotagent-sigfox

# RPM Building folder
%define _build_root_project %{buildroot}%{_install_dir}
# -------------------------------------------------------------------------------------------- #
# prep section, setup macro:
# -------------------------------------------------------------------------------------------- #
%prep
echo "[INFO] Preparing installation"
# Create rpm/BUILDROOT folder
/bin/rm -Rf $RPM_BUILD_ROOT && /bin/mkdir -p $RPM_BUILD_ROOT
[ -d %{_build_root_project} ] || /bin/mkdir -p %{_build_root_project}

# Copy src files
/bin/cp -R %{_srcdir}/lib \
      %{_srcdir}/bin \
      %{_srcdir}/config.js \
      %{_srcdir}/package.json \
      %{_srcdir}/LICENSE \
      %{_build_root_project}
      
[ -f %{_srcdir}/npm-shrinkwrap.json ] && /bin/cp %{_srcdir}/npm-shrinkwrap.json %{_build_root_project}

/bin/cp -R %{_topdir}/SOURCES/etc %{buildroot}

# -------------------------------------------------------------------------------------------- #
# Build section:
# -------------------------------------------------------------------------------------------- #
%build
echo "[INFO] Building RPM"
cd %{_build_root_project}

# Only production modules
/bin/rm -fR node_modules/
npm cache clear
npm install --production

# -------------------------------------------------------------------------------------------- #
# pre-install section:
# -------------------------------------------------------------------------------------------- #
%pre
echo "[INFO] Creating %{_project_user} user"
grep ^%{_project_user}: /etc/passwd
RET_VAL=$?
if [ "$RET_VAL" != "0" ]; then
      /usr/sbin/useradd -s "/bin/bash" -d %{_install_dir} %{_project_user}
      RET_VAL=$?
      if [ "$RET_VAL" != "0" ]; then
         echo "[ERROR] Unable create %{_project_user} user" \
         exit $RET_VAL
      fi
else
      /bin/mv %{_install_dir}/config.js /tmp
fi

# -------------------------------------------------------------------------------------------- #
# post-install section:
# -------------------------------------------------------------------------------------------- #
%post
    echo "[INFO] Configuring application"
    echo "[INFO] Creating the home Ultralight IoT Agent directory"
    /bin/mkdir -p _install_dir
    echo "[INFO] Creating log & run directory"
    /bin/mkdir -p %{_iotasigfox_log_dir}
    chown -R %{_project_user}:%{_project_user} %{_iotasigfox_log_dir}
    chown -R %{_project_user}:%{_project_user} _install_dir
    chmod g+s %{_iotasigfox_log_dir}
    setfacl -d -m g::rwx %{_iotasigfox_log_dir}
    setfacl -d -m o::rx %{_iotasigfox_log_dir}

    /bin/mkdir -p %{_iotasigfox_pid_dir}
    chown -R %{_project_user}:%{_project_user} %{_iotasigfox_pid_dir}
    chown -R %{_project_user}:%{_project_user} _install_dir
    chmod g+s %{_iotasigfox_pid_dir}
    setfacl -d -m g::rwx %{_iotasigfox_pid_dir}
    setfacl -d -m o::rx %{_iotasigfox_pid_dir}

    echo "[INFO] Configuring application service"
    cd /etc/init.d
    chkconfig --add %{_service_name}

    # restores old configuration if any
    [ -f /tmp/config.js ] && /bin/mv /tmp/config.js %{_install_dir}/config.js

    # Chmod iotagent-sigfox binary
    chmod guo+x %{_install_dir}/bin/%{_iotasigfox_executable}

    echo "Done"

# -------------------------------------------------------------------------------------------- #
# pre-uninstall section:
# -------------------------------------------------------------------------------------------- #
%preun

echo "[INFO] stoping service %{_service_name}"
service %{_service_name} stop &> /dev/null

if [ $1 == 0 ]; then

  echo "[INFO] Removing application log files"
  # Log
  [ -d %{_iotasigfox_log_dir} ] && /bin/rm -rf %{_iotasigfox_log_dir}

  echo "[INFO] Removing application run files"
  # Log
  [ -d %{_iotasigfox_pid_dir} ] && /bin/rm -rf %{_iotasigfox_pid_dir}

  echo "[INFO] Removing application files"
  # Installed files
  [ -d %{_install_dir} ] && /bin/rm -rf %{_install_dir}

  echo "[INFO] Removing application user"
  userdel -fr %{_project_user}

  echo "[INFO] Removing application service"
  chkconfig --del %{_service_name}
  /bin/rm -Rf /etc/init.d/%{_service_name}
  echo "Done"
fi

# -------------------------------------------------------------------------------------------- #
# post-uninstall section:
# clean section:
# -------------------------------------------------------------------------------------------- #
%postun
%clean
/bin/rm -rf $RPM_BUILD_ROOT

# -------------------------------------------------------------------------------------------- #
# Files to add to the RPM
# -------------------------------------------------------------------------------------------- #
%files
%defattr(644,%{_project_user},%{_project_user},755)
%config /etc/init.d/%{_service_name}
%attr(755, root, root) /etc/init.d/%{_service_name}
%config /etc/logrotate.d/logrotate-iotasigfox.conf
%config /etc/iotasigfox.d/iotasigfox.default.conf
%config /etc/cron.d/cron-logrotate-iotasigfox-size
%config /etc/sysconfig/logrotate-iotasigfox-size
%config /etc/sysconfig/iotasigfox.conf
%{_install_dir}

%changelog

Initial release (1.0.0)
    Update Dockerfile to Centos7 and Node 4.8.4
    Add plugin system (#2).
    Update iotagent node library to allow use env variables
    Add Travis conf
    Check existence of mappings in internalAttributes for device provisioning (#22)
    Remove mongodb dependence from packages.json (already in iota-node-lib)

